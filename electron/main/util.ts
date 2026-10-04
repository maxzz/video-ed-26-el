import { access, constants } from 'node:fs/promises';
import os from 'node:os';
import { app, clipboard, ClipboardItem, nativeImage } from 'electron';

export const platform = os.platform();
export const arch = os.arch();

export const isWindows = platform === 'win32';
export const isMac = platform === 'darwin';
export const isLinux = platform === 'linux';

export const isDev = !app.isPackaged;

export const isStoreBuild = !!(process.windowsStore || process.mas);

/** Accepts any image format nativeImage can decode (png, jpeg) */
export async function writeClipboardImage(data: Uint8Array) {
    const png = nativeImage.createFromBuffer(Buffer.from(data)).toPNG();
    await clipboard.write([new ClipboardItem({ 'image/png': new Blob([new Uint8Array(png)], { type: 'image/png' }) })]);
}

export async function pathExists(path: string) {
    try {
        await access(path, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}
