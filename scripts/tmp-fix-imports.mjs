import { createScanner } from 'typescript/unstable/ast/scanner';
import fs from 'node:fs';
import path from 'node:path';

const EOF = 1;
const StringLiteral = 10;
const OpenBrace = 18;
const CloseBrace = 19;
const OpenParen = 20;
const Comma = 27;
const Asterisk = 41;
const ImportKeyword = 101;
const AsKeyword = 129;
const FromKeyword = 161;

// Lines that load a *.test.ts / *.test.tsx module (Vitest) keep that extension.
function keepsTsExtension(value) {
    return value.endsWith('.d.ts') || value.endsWith('.test.ts') || value.endsWith('.test.tsx');
}

// `name/index.ts` and `name/index.tsx` import the folder. `./index.ts` becomes `.`, `../index.ts` becomes `..`.
function stripTrailingIndex(value) {
    const parts = value.split(/[/\\]/);
    if (parts.length < 2) return value;
    const last = parts[parts.length - 1];
    if (last !== 'index' && last !== 'index.ts' && last !== 'index.tsx') return value;
    parts.pop();
    if (parts.length === 1 && parts[0] === '') return '.';
    return parts.join('/');
}

function fixModuleSpecifier(raw) {
    if (raw.length < 2) return raw;
    const quote = raw[0];
    if (quote !== "'" && quote !== '"') return raw;
    let value = raw.slice(1, -1).replace(/\\(.)/g, '$1');
    if (!keepsTsExtension(value)) {
        if (value.endsWith('.tsx')) value = value.slice(0, -4);
        else if (value.endsWith('.ts')) value = value.slice(0, -3);
    }
    value = stripTrailingIndex(value);
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function transform(text, jsx) {
    const scanner = createScanner(true, jsx ? 1 : 0, text);
    const edits = [];
    let primed = false;

    let steps = 0;
    function read() {
        if (!primed) {
            scanner.scan();
            primed = true;
        }
        const tok = {
            kind: scanner.getToken(),
            text: scanner.getTokenText(),
            start: scanner.getTokenStart(),
            end: scanner.getTokenEnd(),
        };
        scanner.scan();
        if (tok.kind !== EOF && scanner.getTokenStart() < tok.end) {
            scanner.resetTokenState(Math.min(text.length, tok.end));
            scanner.scan();
        }
        steps++;
        if (steps > text.length + 1000) {
            throw new Error(`scanner stalled at ${tok.start} kind ${tok.kind} text ${JSON.stringify(tok.text)}`);
        }
        return tok;
    }

    function peekKind() {
        return scanner.getToken();
    }

    function fixSpecifier(tok) {
        if (tok.kind !== StringLiteral) return;
        const raw = text.slice(tok.start, tok.end);
        const next = fixModuleSpecifier(raw);
        if (next !== raw) edits.push({ start: tok.start, end: tok.end, text: next });
    }

    function removeTypeKeyword(typeTok) {
        const before = text[typeTok.start - 1];
        const after = text[typeTok.end];
        if (before === ' ' && (after === ' ' || after === '\n' || after === '\r')) {
            edits.push({ start: typeTok.start - 1, end: typeTok.end, text: '' });
        } else {
            edits.push({ start: typeTok.start, end: typeTok.end, text: '' });
        }
    }

    function parseNamed(prefix) {
        let tok = read();
        while (tok.kind !== CloseBrace && tok.kind !== EOF) {
            if (tok.kind === Comma) {
                tok = read();
                continue;
            }
            const nextKind = peekKind();
            const isTypeModifier = tok.text === 'type' && nextKind !== AsKeyword && nextKind !== Comma && nextKind !== CloseBrace && nextKind !== EOF;
            if (!isTypeModifier && prefix) {
                edits.push({ start: tok.start, end: tok.start, text: 'type ' });
            }
            if (isTypeModifier) tok = read();
            if (peekKind() === AsKeyword) {
                read();
                read();
            }
            tok = read();
        }
    }

    function parseImport() {
        let tok = read();

        if (tok.kind === OpenParen) {
            const maybe = read();
            if (maybe.kind === StringLiteral) fixSpecifier(maybe);
            return read();
        }

        if (tok.text === '.') return read();

        if (tok.kind === StringLiteral) {
            fixSpecifier(tok);
            return read();
        }

        let prefixNamed = false;

        if (tok.text === 'type') {
            const next = peekKind();
            if (next === OpenBrace) {
                removeTypeKeyword(tok);
                prefixNamed = true;
                tok = read();
            } else if (next === Asterisk) {
                tok = read();
            } else if (next !== FromKeyword && next !== Comma) {
                tok = read();
                if (peekKind() === Comma) {
                    read();
                    tok = read();
                    if (tok.kind === OpenBrace) prefixNamed = true;
                }
            }
        }

        if (tok.kind === OpenBrace) {
            parseNamed(prefixNamed);
            tok = read();
        } else if (tok.kind === Asterisk) {
            if (peekKind() === AsKeyword) {
                read();
                read();
            }
            tok = read();
        } else if (tok.kind !== FromKeyword) {
            if (peekKind() === Comma) {
                read();
                tok = read();
                if (tok.kind === OpenBrace) {
                    parseNamed(prefixNamed);
                    tok = read();
                } else if (tok.kind === Asterisk) {
                    if (peekKind() === AsKeyword) {
                        read();
                        read();
                    }
                    tok = read();
                }
            } else {
                tok = read();
            }
        }

        if (tok.kind === FromKeyword) {
            const spec = read();
            if (spec.kind === StringLiteral) fixSpecifier(spec);
            return read();
        }
        return tok;
    }

    function jump(pos) {
        scanner.resetTokenState(pos);
        primed = false;
        steps = 0;
    }

    // Only statements whose line starts with the word import. That leaves
    // `export … from`, `await import()`, and `vi.mock(..., () => import(...))` alone.
    const headerRe = /^[ \t]*import\b/gm;
    for (let match = headerRe.exec(text); match; match = headerRe.exec(text)) {
        const pos = match.index + match[0].length - 'import'.length;
        jump(pos);
        const tok = read();
        if (tok.kind === ImportKeyword) parseImport();
    }

    edits.sort((a, b) => b.start - a.start || b.end - a.end);
    let out = text;
    for (const edit of edits) {
        out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
    }
    return out;
}

const cases = [
    [`import type { Foo, Bar as Baz } from './a.ts';`, `import { type Foo, type Bar as Baz } from "./a";`],
    [`import type {\n  Foo,\n  Bar,\n} from './a.tsx';`, `import {\n  type Foo,\n  type Bar,\n} from "./a";`],
    [`import { type Foo, bar } from './b.ts';`, `import { type Foo, bar } from "./b";`],
    [`import './c.css';`, `import "./c.css";`],
    [`import './c.ts';`, `import "./c";`],
    [`export { X } from './d.tsx';`, `export { X } from './d.tsx';`],
    [`export type { Y } from './e.ts';`, `export type { Y } from './e.ts';`],
    [`import type Foo from './f.ts';`, `import type Foo from "./f";`],
    [`import type * as NS from './g.ts';`, `import type * as NS from "./g";`],
    [`import type Foo, { Bar } from './h.ts';`, `import type Foo, { type Bar } from "./h";`],
    [`import type from './i.ts';`, `import type from "./i";`],
    [`import type, { Foo } from './j.ts';`, `import type, { Foo } from "./j";`],
    [`import "already.ts";`, `import "already";`],
    [`const { x } = await import('./z.tsx');`, `const { x } = await import('./z.tsx');`],
    [`import { a, b } from "react";`, `import { a, b } from "react";`],
    [`import React, * as ReactDOM from 'react';`, `import React, * as ReactDOM from "react";`],
    [`import * as path from 'node:path';`, `import * as path from "node:path";`],
    [`import type { A } from './file.d.ts';`, `import { type A } from "./file.d.ts";`],
    [`export const x = await import('./a.ts');`, `export const x = await import('./a.ts');`],
    [`import type { A } from './a.ts';\nexport function F(){ return <div className="from './nope.ts'">x</div>; }\nexport { A } from './b.tsx';\nconst x = import('./c.ts');`, `import { type A } from "./a";\nexport function F(){ return <div className="from './nope.ts'">x</div>; }\nexport { A } from './b.tsx';\nconst x = import('./c.ts');`],
    [`vi.mock('@/editor/0-core/8-lib/main-api.ts', () => import('./main-api-mock.ts'));`, `vi.mock('@/editor/0-core/8-lib/main-api.ts', () => import('./main-api-mock.ts'));`],
    [`import { type MenuAction, runMenuAction } from '@/editor/0-core/menu-actions/index.ts';`, `import { type MenuAction, runMenuAction } from "@/editor/0-core/menu-actions";`],
    [`import { StreamsSelector } from '@/editor/6-streams/index.tsx';`, `import { StreamsSelector } from "@/editor/6-streams";`],
    [`import { setBatchFiles } from '@/editor/2-file/index';`, `import { setBatchFiles } from "@/editor/2-file";`],
    [`import { loadViewsSideEffects } from './views-load-side-effects/index.ts';`, `import { loadViewsSideEffects } from "./views-load-side-effects";`],
    [`import { local } from './index.ts';`, `import { local } from ".";`],
    [`import { parent } from '../index.tsx';`, `import { parent } from "..";`],
    [`import { readFile } from './foo.test.ts';`, `import { readFile } from "./foo.test.ts";`],
    [`import { readFile } from './foo.test.tsx';`, `import { readFile } from "./foo.test.tsx";`],
    [`import type { Foo as Bar } from './a.ts'`, `import { type Foo as Bar } from "./a"`],
];

let failed = 0;
for (const [input, expected] of cases) {
    const actual = transform(input, false);
    if (actual !== expected) {
        failed++;
        console.log('FAIL');
        console.log(' in:', JSON.stringify(input));
        console.log('exp:', JSON.stringify(expected));
        console.log('got:', JSON.stringify(actual));
    }
}
if (failed) {
    console.error(`${failed} fixture(s) failed`);
    process.exit(1);
}
console.log(`fixtures ok (${cases.length})`);

if (process.argv.includes('--check')) process.exit(0);

function walk(dir, acc) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules') continue;
            walk(full, acc);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
            acc.push(full);
        }
    }
    return acc;
}

const root = path.resolve('src');
const files = walk(root, []);
let changed = 0;
for (const file of files) {
    const original = fs.readFileSync(file, 'utf8');
    let next;
    try {
        next = transform(original, file.endsWith('.tsx'));
    } catch (error) {
        console.error('FAIL', file);
        console.error(error);
        process.exit(1);
    }
    if (next !== original) {
        fs.writeFileSync(file, next);
        changed++;
    }
}
console.log(`updated ${changed} of ${files.length} files`);
