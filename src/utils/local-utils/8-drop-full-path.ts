import { preloadEnv } from "@/editor/0-core/7-actions/0-main-api";

/** Absolute paths of files dropped from the OS (Electron webUtils.getPathForFile via the preload) */
export function getDroppedFilePaths(dataTransfer: DataTransfer | null | undefined) {
    if (!dataTransfer) {
        return [];
    }
    return [...dataTransfer.files].map((f) => preloadEnv.getPathForFile(f)).filter((p) => p !== '');
}
