import fs from 'node:fs';
import path from 'node:path';

// Reports import lines (a line that starts with `import`) that still use
// single quotes, a grouped `import type { … }`, or a .ts/.tsx extension.
// `*.test.ts` / `*.test.tsx` and `*.d.ts` are allowed to keep their extension.
// Lines that do not start with `import` (vi.mock, await import(), export from) are ignored.

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
        if (!/^[ \t]*import\b/.test(line)) return;
        const at = `${file}:${i + 1}`;
        if (/import\s+type\s*\{/.test(line)) issues.push(`${at} grouped type import`);
        const spec = line.match(/\bfrom\s+("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/);
        const side = line.match(/^[ \t]*import\s+("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/);
        const raw = (spec ?? side)?.[1];
        if (raw?.[0] === "'") issues.push(`${at} single quote`);
        if (!raw) return;
        const value = raw.slice(1, -1);
        if (value.endsWith('.d.ts') || value.endsWith('.test.ts') || value.endsWith('.test.tsx')) return;
        if (value.endsWith('.ts') || value.endsWith('.tsx')) issues.push(`${at} extension ${raw}`);
    });
}

console.log(issues.length ? issues.join('\n') : 'import lines ok');
if (issues.length) process.exitCode = 1;
