// Types only. The worker must import this file, not eval.ts.
// eval.ts constructs the worker, and Vite's worker transform keeps a runtime
// import even for `import { type }`. Importing eval.ts from the worker
// therefore spawns a worker that spawns a worker until the renderer OOMs.

export interface RequestMessageData {
    code: string,
    id: number,
    context: string // json
}

export type ResponseMessageData = { id: number } & ({
    error: string,
} | {
    data: unknown,
})
