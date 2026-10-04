import path from 'node:path';
import { vi, type Mock } from 'vitest';
import type { AppInfo, FfCommand, MainApi, MainEventsApi, NodePathApi, PreloadEnv } from '@shared/ipc-contract.ts';
import { getFfCommandLine as getFfCommandLineShared } from '@shared/ff-command-line.ts';
import { defaultConfig } from '@shared/default-config.ts';

// Replaces src/editor/0-core/2-lib/main-api.ts in unit tests (see setup.ts).
// Every mainApi method is a vi.fn() that rejects until a test mocks it: vi.mocked(mainApi.stat).mockResolvedValue(...)

const methodMocks = new Map<string, Mock>();

function getMethodMock(name: string) {
    let fn = methodMocks.get(name);
    if (!fn) {
        fn = vi.fn(async () => { throw new Error(`mainApi.${name} is not mocked`); });
        methodMocks.set(name, fn);
    }
    return fn;
}

export const isElectron = false;

export const mainApi = new Proxy({} as MainApi, {
    get: (_target, prop) => (typeof prop === 'string' ? getMethodMock(prop) : undefined),
});

export const mainEvents: MainEventsApi = {
    on: () => () => {},
};

export const nodePath: NodePathApi = path;

export const preloadEnv: PreloadEnv = {
    platform: process.platform,
    arch: process.arch,
    getPathForFile: () => '',
    toMediaUrl: (p) => p,
};

export const isWindows = process.platform === 'win32';
export const isMac = process.platform === 'darwin';
export const isLinux = process.platform === 'linux';

export const testAppInfo: AppInfo = {
    appName: 'VideoEd',
    version: '1.0.0',
    platform: process.platform,
    arch: process.arch,
    isDev: true,
    isPackaged: false,
    isWindows,
    isMac,
    isLinux,
    paths: { userData: '/', downloads: '/', documents: '/', desktop: '/', home: '/', temp: '/', configFile: '/config.json', logFile: '/app.log' },
    lossyMode: undefined,
    disableNetworking: true,
    newVersion: undefined,
};

export async function loadAppInfo() {
    return testAppInfo;
}

export function getAppInfo(): AppInfo {
    return testAppInfo;
}

export const getFfCommandLine = (cmd: FfCommand, args: readonly string[]) => getFfCommandLineShared(cmd, args, isWindows);

/** Restores default behavior of all mainApi mocks */
export function resetMainApiMocks() {
    methodMocks.clear();
    getMethodMock('configGetAll').mockResolvedValue(structuredClone(defaultConfig));
}

resetMainApiMocks();
