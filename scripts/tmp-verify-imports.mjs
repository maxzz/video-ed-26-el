import fs from 'node:fs';
import path from 'node:path';

function walk(dir, acc = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, acc);
        else if (/\.(ts|tsx)$/.test(entry.name)) acc.push(full);
    }
    return acc;
}

let count = 0;
for (const file of walk('src')) {
    const text = fs.readFileSync(file, 'utf8');
    const matches = text.match(/import type\b[^\n]*/g);
    if (matches) {
        for (const match of matches) console.log(`${file}: ${match}`);
        count += matches.length;
    }
}
console.log('count', count);
