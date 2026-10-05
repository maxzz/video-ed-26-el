import { type AppInfo, type MainApi, type MainEventsApi, type NodePathApi, type PreloadEnv } from '@shared/ipc-contract.ts';
import { type FfCommand } from '@shared/ipc-contract.ts';

import { createWebMockMainApi, webMockEnv, webMockEvents, webMockPath } from './1-web-mock.ts';
import { getFfCommandLine as getFfCommandLineShared } from '@shared/ff-command-line.ts';

export const isElectron = window.mainApi != null;

/** Typed bridge to the main process (see shared/ipc-contract.ts) */
export const mainApi: MainApi = window.mainApi ?? createWebMockMainApi();
export const mainEvents: MainEventsApi = window.mainEvents ?? webMockEvents;
export const nodePath: NodePathApi = window.nodePath ?? webMockPath;
export const preloadEnv: PreloadEnv = window.preloadEnv ?? webMockEnv;

export const isWindows = preloadEnv.platform === 'win32';
export const isMac = preloadEnv.platform === 'darwin';
export const isLinux = preloadEnv.platform === 'linux';

let appInfoValue: AppInfo | undefined;

/** Must be awaited once before rendering (see src/main.tsx) */
export async function loadAppInfo() {
    appInfoValue = await mainApi.getAppInfo();
    return appInfoValue;
}

export function getAppInfo(): AppInfo {
    if (!appInfoValue) {
        throw new Error('App info not loaded yet');
    }
    return appInfoValue;
}

export const getFfCommandLine = (cmd: FfCommand, args: readonly string[]) => getFfCommandLineShared(cmd, args, isWindows);
