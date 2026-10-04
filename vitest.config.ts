import path from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src'),
            '@shared': path.resolve(import.meta.dirname, './shared'),
        },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts', 'shared/**/*.test.ts', 'electron/**/*.test.ts'],
        exclude: [...configDefaults.exclude, 'out/**', 'release/**'],
        setupFiles: ['./src/editor/f-platform/test/setup.ts'],
    },
});
