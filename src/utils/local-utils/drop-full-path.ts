import { preloadEnv } from '@/editor/0-core/8-lib/main-api.ts';

/** Absolute paths of files dropped from the OS (Electron webUtils.getPathForFile via the preload) */
export function getDroppedFilePaths(dataTransfer: DataTransfer | null | undefined) {
    if (!dataTransfer) {
        return [];
    }
    return [...dataTransfer.files].map((f) => preloadEnv.getPathForFile(f)).filter((p) => p !== '');
}
