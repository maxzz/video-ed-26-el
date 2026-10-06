# Import formatter

`tmp-fix-imports.mjs` rewrites import statements in `src`. A statement is rewritten only when its line starts with the word `import` (leading whitespace is allowed). The whole statement is rewritten, including a `from` clause on a following line.

What it changes on those statements:

- Module paths use double quotes.
- A trailing `.ts` or `.tsx` is removed.
- A path ending in `/index.ts`, `/index.tsx`, or `/index` imports the folder. `./index.ts` becomes `"."` and `../index.ts` becomes `".."`.
- These extensions stay: `.css`, `.js`, `.d.ts`, `.test.ts`, `.test.tsx`.
- `import type { A, B }` becomes `import { type A, type B }`. Each type gets its own `type` keyword.
- `import type Name` and `import type * as Name` stay type-only. A default type has no brace form.
- `import type Name, { A }` keeps `import type` on the default and writes `type` on each braced name.

Lines that do not start with `import` are left as they are. That includes `export … from`, `export function`, `await import()`, `const x = import()`, and `vi.mock(..., () => import(...))`.

## Run

From the repository root:

```bash
node scripts/tmp-fix-imports.mjs --check
```

`--check` runs the fixture list and does not write files. Exit code 0 means every fixture matched.

```bash
node scripts/tmp-fix-imports.mjs
```

The same fixtures run first. If they pass, every `*.ts` and `*.tsx` file under `src` is updated in place. The script prints how many files changed.

```bash
node scripts/tmp-verify-imports.mjs
```

This checks `src` without writing. It reports an import line that still uses `import type { … }`, a single-quoted specifier, a `.ts` / `.tsx` suffix other than `.d.ts`, `.test.ts`, or `.test.tsx`, or a path ending in `/index`.

`tmp-probe-imports.mjs` prints TypeScript scanner token kinds. It does not rewrite files.

## Cases

| Case | Input | Output |
| --- | --- | --- |
| Grouped type import | `import type { Foo, Bar as Baz } from './a.ts';` | `import { type Foo, type Bar as Baz } from "./a";` |
| Grouped type import, several lines | `import type {\n  Foo,\n  Bar,\n} from './a.tsx';` | `import {\n  type Foo,\n  type Bar,\n} from "./a";` |
| Type and value in one import | `import { type Foo, bar } from './b.ts';` | `import { type Foo, bar } from "./b";` |
| Alias inside a grouped type import | `import type { Foo as Bar } from './a.ts'` | `import { type Foo as Bar } from "./a"` |
| Side-effect import, non-script file | `import './c.css';` | `import "./c.css";` |
| Side-effect import, script file | `import './c.ts';` | `import "./c";` |
| Side-effect import, quotes already double | `import "already.ts";` | `import "already";` |
| Default type import | `import type Foo from './f.ts';` | `import type Foo from "./f";` |
| Namespace type import | `import type * as NS from './g.ts';` | `import type * as NS from "./g";` |
| Default type plus named types | `import type Foo, { Bar } from './h.ts';` | `import type Foo, { type Bar } from "./h";` |
| Default binding named `type` | `import type from './i.ts';` | `import type from "./i";` |
| Default binding named `type`, plus a value | `import type, { Foo } from './j.ts';` | `import type, { Foo } from "./j";` |
| Value import, package name | `import { a, b } from "react";` | `import { a, b } from "react";` |
| Default plus namespace | `import React, * as ReactDOM from 'react';` | `import React, * as ReactDOM from "react";` |
| Namespace import | `import * as path from 'node:path';` | `import * as path from "node:path";` |
| Declaration file | `import type { A } from './file.d.ts';` | `import { type A } from "./file.d.ts";` |
| Folder barrel, `.ts` | `import { type MenuAction, runMenuAction } from '@/editor/0-core/menu-actions/index.ts';` | `import { type MenuAction, runMenuAction } from "@/editor/0-core/menu-actions";` |
| Folder barrel, `.tsx` | `import { StreamsSelector } from '@/editor/6-streams/index.tsx';` | `import { StreamsSelector } from "@/editor/6-streams";` |
| Folder barrel, extension already removed | `import { setBatchFiles } from '@/editor/2-file/index';` | `import { setBatchFiles } from "@/editor/2-file";` |
| Relative folder barrel | `import { loadViewsSideEffects } from './views-load-side-effects/index.ts';` | `import { loadViewsSideEffects } from "./views-load-side-effects";` |
| Current folder barrel | `import { local } from './index.ts';` | `import { local } from ".";` |
| Parent folder barrel | `import { parent } from '../index.tsx';` | `import { parent } from "..";` |
| Vitest module, `.test.ts` | `import { readFile } from './foo.test.ts';` | `import { readFile } from "./foo.test.ts";` |
| Vitest module, `.test.tsx` | `import { readFile } from './foo.test.tsx';` | `import { readFile } from "./foo.test.tsx";` |
| Re-export | `export { X } from './d.tsx';` | `export { X } from './d.tsx';` |
| Type-only re-export | `export type { Y } from './e.ts';` | `export type { Y } from './e.ts';` |
| Dynamic import | `const { x } = await import('./z.tsx');` | `const { x } = await import('./z.tsx');` |
| Dynamic import inside an export | `export const x = await import('./a.ts');` | `export const x = await import('./a.ts');` |
| Vitest mock factory | `vi.mock('@/editor/0-core/8-lib/main-api.ts', () => import('./main-api-mock.ts'));` | `vi.mock('@/editor/0-core/8-lib/main-api.ts', () => import('./main-api-mock.ts'));` |
| Import beside untouched code | `import type { A } from './a.ts';\nexport function F(){ return <div className="from './nope.ts'">x</div>; }\nexport { A } from './b.tsx';\nconst x = import('./c.ts');` | `import { type A } from "./a";\nexport function F(){ return <div className="from './nope.ts'">x</div>; }\nexport { A } from './b.tsx';\nconst x = import('./c.ts');` |

`\n` in the table is a real line break. The last row shows that only the line starting with `import` changes. The string `from './nope.ts'` inside JSX, the `export … from` line, and `import()` stay as written.
