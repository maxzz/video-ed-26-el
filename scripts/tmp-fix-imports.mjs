import { createScanner } from 'typescript/unstable/ast/scanner';
import fs from 'node:fs';
import path from 'node:path';

const EOF = 1;
const StringLiteral = 10;
const OpenBrace = 18;
const CloseBrace = 19;
const OpenParen = 20;
const CloseParen = 21;
const OpenBracket = 22;
const CloseBracket = 23;
const Semicolon = 26;
const Comma = 27;
const Asterisk = 41;
const ExportKeyword = 94;
const ImportKeyword = 101;
const AsKeyword = 129;
const FromKeyword = 161;

function fixModuleSpecifier(raw) {
    if (raw.length < 2) return raw;
    const quote = raw[0];
    if (quote !== "'" && quote !== '"') return raw;
    let value = raw.slice(1, -1).replace(/\\(.)/g, '$1');
    if (value.endsWith('.tsx')) value = value.slice(0, -4);
    else if (value.endsWith('.ts') && !value.endsWith('.d.ts')) value = value.slice(0, -3);
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

        if (tok.kind === OpenParen) return read();

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

    function parseExport() {
        let tok = read();
        if (tok.text === 'type') {
            const after = peekKind();
            if (after !== OpenBrace && after !== Asterisk) return;
            tok = read();
        }
        if (tok.kind !== OpenBrace && tok.kind !== Asterisk) return;

        if (tok.kind === Asterisk) {
            if (peekKind() === AsKeyword) {
                read();
                read();
            }
            tok = read();
        } else {
            let depth = 1;
            tok = read();
            while (tok.kind !== EOF && depth > 0) {
                if (tok.kind === OpenBrace) depth++;
                else if (tok.kind === CloseBrace) depth--;
                tok = read();
            }
        }
        if (tok.kind === FromKeyword) {
            const spec = read();
            if (spec.kind === StringLiteral) fixSpecifier(spec);
        }
    }

    function jump(pos) {
        scanner.resetTokenState(pos);
        primed = false;
        steps = 0;
    }

    const starts = [];
    const headerRe = /(?:^|[\n;])[ \t]*(import|export)\b/g;
    for (let match = headerRe.exec(text); match; match = headerRe.exec(text)) {
        starts.push(match.index + match[0].length - match[1].length);
    }
    for (const pos of starts) {
        jump(pos);
        const tok = read();
        if (tok.kind === ImportKeyword) parseImport();
        else if (tok.kind === ExportKeyword) parseExport();
    }

    const dynamicRe = /\bimport[ \t]*\([ \t]*(['"])((?:\\.|(?!\1)[^\\])*)\1/g;
    for (let match = dynamicRe.exec(text); match; match = dynamicRe.exec(text)) {
        const quote = match[1];
        const raw = quote + match[2] + quote;
        const next = fixModuleSpecifier(raw);
        if (next !== raw) {
            const start = match.index + match[0].indexOf(quote);
            edits.push({ start, end: start + raw.length, text: next });
        }
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
    [`export { X } from './d.tsx';`, `export { X } from "./d";`],
    [`export type { Y } from './e.ts';`, `export type { Y } from "./e";`],
    [`import type Foo from './f.ts';`, `import type Foo from "./f";`],
    [`import type * as NS from './g.ts';`, `import type * as NS from "./g";`],
    [`import type Foo, { Bar } from './h.ts';`, `import type Foo, { type Bar } from "./h";`],
    [`import type from './i.ts';`, `import type from "./i";`],
    [`import type, { Foo } from './j.ts';`, `import type, { Foo } from "./j";`],
    [`import "already.ts";`, `import "already";`],
    [`const { x } = await import('./z.tsx');`, `const { x } = await import("./z");`],
    [`import { a, b } from "react";`, `import { a, b } from "react";`],
    [`import React, * as ReactDOM from 'react';`, `import React, * as ReactDOM from "react";`],
    [`import * as path from 'node:path';`, `import * as path from "node:path";`],
    [`import type { A } from './file.d.ts';`, `import { type A } from "./file.d.ts";`],
    [`export const x = await import('./a.ts');`, `export const x = await import("./a");`],
    [`import type { A } from './a.ts';\nexport function F(){ return <div className="from './nope.ts'">x</div>; }\nexport { A } from './b.tsx';\nconst x = import('./c.ts');`, `import { type A } from "./a";\nexport function F(){ return <div className="from './nope.ts'">x</div>; }\nexport { A } from "./b";\nconst x = import("./c");`],
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
