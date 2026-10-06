import fs from 'node:fs';
import path from 'node:path';

// Reports import lines and re-export lines that still use single quotes,
// a grouped `import type { … }` or `export type { … }`, a .ts/.tsx extension,
// or a trailing `/index`, `/index.ts`, or `/index.tsx`.
// `*.test.ts` / `*.test.tsx` and `*.d.ts` are allowed to keep their extension.
// `vi.mock`, `await import()`, and export declarations that are not re-exports are ignored.

function walk(dir, acc = []) {
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

const issues = [];
for (const file of walk('src')) {
    const lines = fs.readFileSync(file, 'utf8').split(/\n/);
    lines.forEach((line, i) => {
        const isImport = /^[ \t]*import\b/.test(line);
        const isExport = /^[ \t]*export\b/.test(line);
        if (!isImport && !isExport) return;
        const at = `${file}:${i + 1}`;
        if (/(import|export)\s+type\s*\{/.test(line)) issues.push(`${at} grouped type`);
        const spec = line.match(/\bfrom\s+("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/);
        const side = isImport ? line.match(/^[ \t]*import\s+("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/) : null;
        const raw = (spec ?? side)?.[1];
        if (raw?.[0] === "'") issues.push(`${at} single quote`);
        if (!raw) return;
        const value = raw.slice(1, -1);
        if (value.endsWith('.d.ts') || value.endsWith('.test.ts') || value.endsWith('.test.tsx')) return;
        if (value.endsWith('.ts') || value.endsWith('.tsx')) issues.push(`${at} extension ${raw}`);
        if (/(^|[/\\])index$/.test(value)) issues.push(`${at} index path ${raw}`);
    });
}

console.log(issues.length ? issues.join('\n') : 'import and export lines ok');
if (issues.length) process.exitCode = 1;
