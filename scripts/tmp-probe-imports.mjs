import { createScanner } from 'typescript/unstable/ast/scanner';

const sample = "import * as x from './a'; export ( ) [ ] < >";
const s = createScanner(true, 1, sample);
for (let i = 0; i < 20; i++) {
    const k = s.scan();
    if (k === 1) break;
    console.log(k, JSON.stringify(s.getTokenText()));
}

/*
import ts from 'typescript';
const samples = [
    "import type { Foo, Bar as Baz } from './a.ts';",
    "import type {\n  Foo,\n  Bar,\n} from './a.tsx';",
    "import { type Foo, bar } from './b.ts';",
    "import './c.css';",
    "export { X } from './d.tsx';",
    "export type { Y } from './e.ts';",
    "import type Foo from './f.ts';",
    "import type * as NS from './g.ts';",
];
for (const s of samples) {
    const sf = ts.createSourceFile('t.ts', s, ts.ScriptTarget.Latest, true);
    const stmt = sf.statements[0];
    console.log('---');
    console.log(JSON.stringify(s));
    console.log('stmt', stmt.getStart(sf), stmt.getEnd(), JSON.stringify(s.slice(stmt.getStart(sf), stmt.getEnd())));
    if (ts.isImportDeclaration(stmt) && stmt.importClause) {
        const c = stmt.importClause;
        console.log('clause', c.getStart(sf), c.getEnd(), JSON.stringify(s.slice(c.getStart(sf), c.getEnd())), 'isTypeOnly', c.isTypeOnly);
        const nb = c.namedBindings;
        if (nb && ts.isNamedImports(nb)) {
            for (const el of nb.elements) {
                console.log(' spec', el.getStart(sf), el.getEnd(), JSON.stringify(s.slice(el.getStart(sf), el.getEnd())), 'isTypeOnly', el.isTypeOnly);
            }
        }
    }
    const spec = stmt.moduleSpecifier;
    if (spec) console.log('mod', spec.getStart(sf), spec.getEnd(), JSON.stringify(s.slice(spec.getStart(sf), spec.getEnd())));
}
*/