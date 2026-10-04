import { join } from 'node:path';
import { access } from 'node:fs/promises';
import { app } from 'electron';
import type { FfCommand } from '@shared/ipc-contract.ts';
import { platform, arch, isWindows } from '../util.ts';

let customFfPath: string | undefined;

export function setCustomFfPath(path: string | undefined) {
    customFfPath = path || undefined;
}

export function hasCustomFfPath() {
    return customFfPath != null;
}

/** Folder that holds ffmpeg, ffprobe and (for shared builds) their libraries */
export function getFfDir() {
    if (customFfPath) {
        return customFfPath;
    }
    if (app.isPackaged) {
        return join(process.resourcesPath, 'ffmpeg');
    }
    return join(app.getAppPath(), 'resources', 'ffmpeg', `${platform}-${arch}`);
}

export function getFfPath(cmd: FfCommand) {
    return join(getFfDir(), isWindows ? `${cmd}.exe` : cmd);
}

/** Throws ENOENT if missing. On Windows execa would otherwise fall back to cmd.exe and give a confusing error */
export async function checkFfExists(cmd: FfCommand) {
    await access(getFfPath(cmd));
}
