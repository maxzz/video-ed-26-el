import { type MainApi, type MainEventsApi, type NodePathApi, type PreloadEnv } from "@shared/ipc-contract";

declare global {
    interface Window {
        /** Undefined when running in a plain browser (pnpm dev:web) */
        mainApi?: MainApi;
        mainEvents?: MainEventsApi;
        nodePath?: NodePathApi;
        preloadEnv?: PreloadEnv;
    }
}
