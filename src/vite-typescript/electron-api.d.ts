import type { MainApi, MainEventsApi, NodePathApi, PreloadEnv } from '@shared/ipc-contract.ts';

declare global {
    interface Window {
        /** Undefined when running in a plain browser (pnpm dev:web) */
        mainApi?: MainApi;
        mainEvents?: MainEventsApi;
        nodePath?: NodePathApi;
        preloadEnv?: PreloadEnv;
    }
}
