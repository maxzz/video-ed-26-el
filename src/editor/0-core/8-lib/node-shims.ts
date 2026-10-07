import { type FileStat } from "@shared/ipc-contract";
import { mainApi, nodePath } from "../7-actions/0-main-api";

// Node-like `path` and `fs/promises` facades so the ported LosslessCut logic stays close to upstream.
// path runs synchronously in the preload; fs goes through IPC to the main process.

export const { sep, join, resolve, normalize, dirname, basename, extname, isAbsolute, relative } = nodePath;
export const parsePath = (p: string) => nodePath.parse(p);

export interface NodeLikeStats {
    size: number;
    atime: Date;
    mtime: Date;
    ctime: Date;
    birthtime: Date;
    atimeMs: number;
    mtimeMs: number;
    isFile(): boolean;
    isDirectory(): boolean;
}

function toNodeLikeStats(s: FileStat): NodeLikeStats {
    return {
        size: s.size,
        atime: new Date(s.atimeMs),
        mtime: new Date(s.mtimeMs),
        ctime: new Date(s.ctimeMs),
        birthtime: new Date(s.birthtimeMs),
        atimeMs: s.atimeMs,
        mtimeMs: s.mtimeMs,
        isFile: () => s.isFile,
        isDirectory: () => s.isDirectory,
    };
}

export const fs = {
    stat: async (path: string) => toNodeLikeStats(await mainApi.stat(path)),
    lstat: async (path: string) => toNodeLikeStats(await mainApi.lstat(path)),
    readdir: async (path: string, options?: { recursive?: boolean; }) => mainApi.readdir(path, options?.recursive),
    /** atime and mtime in seconds, like Node */
    utimes: async (path: string, atime: number, mtime: number) => mainApi.utimes(path, atime * 1000, mtime * 1000),
    unlink: async (path: string) => mainApi.unlink(path),
    rename: async (from: string, to: string) => mainApi.rename(from, to),
    mkdir: async (path: string) => mainApi.mkdir(path),
    readFile: async (path: string) => mainApi.readTextFile(path),
    writeFile: async (path: string, data: string | Uint8Array) => (typeof data === 'string' ? mainApi.writeTextFile(path, data) : mainApi.writeBinaryFile(path, data)),
    accessRead: async (path: string) => mainApi.access(path, 'read'),
    accessWrite: async (path: string) => mainApi.access(path, 'write'),
    exists: async (path: string) => mainApi.pathExists(path),
};
