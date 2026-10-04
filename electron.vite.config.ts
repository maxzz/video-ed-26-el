import path from 'node:path';
import { defineConfig } from 'electron-vite';
import { rendererConfig } from './vite.config.ts';

const sharedAlias = { '@shared': path.resolve(import.meta.dirname, './shared') };

export default defineConfig({
    main: {
        resolve: { alias: sharedAlias },
        build: {
            target: 'node24',
            sourcemap: true,
            rollupOptions: {
                input: { index: path.resolve(import.meta.dirname, 'electron/main/index.ts') },
            },
        },
    },
    preload: {
        resolve: { alias: sharedAlias },
        build: {
            target: 'node24',
            sourcemap: true,
            rollupOptions: {
                input: { index: path.resolve(import.meta.dirname, 'electron/preload/index.ts') },
                output: {
                    // sandboxed preload scripts must be CommonJS
                    format: 'cjs',
                    entryFileNames: '[name].cjs',
                },
            },
        },
    },
    renderer: {
        ...rendererConfig,
        build: {
            ...rendererConfig.build,
            target: 'chrome140',
            sourcemap: true,
            chunkSizeWarningLimit: 3e6,
        },
    },
});
