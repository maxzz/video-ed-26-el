import path from 'node:path';
import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IPC_INVOKE_CHANNEL, mainApiMethods, toMediaUrl, type MainApi, type MainEventsApi, type NodePathApi, type PreloadEnv } from '@shared/ipc-contract.ts';

/** Restores the props that main serialized into the error message (see serializeError in main) */
function deserializeError(err: unknown) {
    if (!(err instanceof Error)) {
        return err;
    }
    const json = err.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
    try {
        const parsed = JSON.parse(json) as { message: string; } & Record<string, unknown>;
        return Object.assign(new Error(parsed.message), parsed);
    } catch {
        return err;
    }
}

const mainApi = Object.fromEntries(mainApiMethods.map((method) => [
    method,
    async (...args: unknown[]) => {
        try {
            return await ipcRenderer.invoke(IPC_INVOKE_CHANNEL, method, args);
        } catch (err) {
            throw deserializeError(err);
        }
    },
])) as unknown as MainApi;

const mainEvents: MainEventsApi = {
    on(event, listener) {
        const wrapped = (_e: unknown, ...args: unknown[]) => (listener as (...a: unknown[]) => void)(...args);
        ipcRenderer.on(event, wrapped);
        return () => {
            ipcRenderer.off(event, wrapped);
        };
    },
};

const p = path;
const nodePath: NodePathApi = {
    sep: p.sep,
    delimiter: p.delimiter,
    join: (...parts) => p.join(...parts),
    resolve: (...parts) => p.resolve(...parts),
    normalize: (x) => p.normalize(x),
    dirname: (x) => p.dirname(x),
    basename: (x, ext) => p.basename(x, ext),
    extname: (x) => p.extname(x),
    isAbsolute: (x) => p.isAbsolute(x),
    relative: (a, b) => p.relative(a, b),
    parse: (x) => ({ ...p.parse(x) }),
    format: (x) => p.format(x),
};

const preloadEnv: PreloadEnv = {
    platform: process.platform,
    arch: process.arch,
    getPathForFile: (file) => webUtils.getPathForFile(file),
    toMediaUrl,
};

contextBridge.exposeInMainWorld('mainApi', mainApi);
contextBridge.exposeInMainWorld('mainEvents', mainEvents);
contextBridge.exposeInMainWorld('nodePath', nodePath);
contextBridge.exposeInMainWorld('preloadEnv', preloadEnv);
