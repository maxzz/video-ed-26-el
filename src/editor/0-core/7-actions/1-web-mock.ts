import type { MainApi, MainEventsApi, NodePathApi, PreloadEnv } from '@shared/ipc-contract.ts';
import type { Config } from '@shared/types.ts';
import { defaultConfig } from '@shared/default-config.ts';
import { appName } from '@shared/constants.ts';

// Lets the renderer run in a plain browser (pnpm dev:web) for UI work. Anything that needs the main process throws.

const CONFIG_KEY = 'video-ed-web-mock-config';

function loadConfig(): Config {
    try {
        return { ...defaultConfig, ...JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '{}') };
    } catch {
        return { ...defaultConfig };
    }
}

const notAvailable = (name: string) => async () => {
    throw new Error(`${name} is not available in the browser`);
};

export function createWebMockMainApi(): MainApi {
    const config = loadConfig();
    const base: Partial<MainApi> = {
        async getAppInfo() {
            return {
                appName, version: 'web', platform: 'web', arch: 'web', isDev: true, isPackaged: false, isWindows: false, isMac: false, isLinux: false,
                paths: { userData: '/', downloads: '/', documents: '/', desktop: '/', home: '/', temp: '/', configFile: '/config.json', logFile: '/app.log' },
                lossyMode: undefined, disableNetworking: false, newVersion: undefined,
            };
        },
        rendererReady: async () => {},
        setProgressBar: async () => {},
        setAskBeforeClose: async () => {},
        setLanguage: async () => {},
        async performHostAction(action) {
            if (action.what === 'openExternal') {
                window.open(action.url, '_blank');
            }
        },
        apiActionResponse: async () => {},
        emitAppEvent: async () => {},
        focusWindow: async () => {},
        sendOsNotification: async () => {},
        openExternal: async (url) => { window.open(url, '_blank'); },
        configGetAll: async () => config,
        async configSet(key, value) {
            config[key] = value;
            localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        },
        async configReset(key) {
            config[key] = defaultConfig[key];
            localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
            return defaultConfig[key];
        },
        pathExists: async () => false,
        writeClipboardText: async (text) => navigator.clipboard.writeText(text),
        readClipboardText: async () => navigator.clipboard.readText(),
        ffCheckExists: async () => ({ ffmpeg: false, ffprobe: false, ffmpegPath: '', ffprobePath: '' }),
        showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
        showSaveDialog: async () => ({ canceled: true, filePath: undefined }),
        showMessageBox: async () => ({ response: 0 }),
    };
    
    return new Proxy(base as MainApi, {
        get: (target, prop: string) => (target as unknown as Record<string, unknown>)[prop] ?? notAvailable(prop),
    });
}

export const webMockEvents: MainEventsApi = {
    on: () => () => {},
};

const posixNormalize = (p: string) => {
    const isAbs = p.startsWith('/');
    const parts: string[] = [];
    for (const part of p.split('/')) {
        if (!part || part === '.') {
            continue;
        }
        if (part === '..') {
            parts.pop();
        } else {
            parts.push(part);
        }
    }
    return (isAbs ? '/' : '') + parts.join('/') || (isAbs ? '/' : '.');
};

export const webMockPath: NodePathApi = {
    sep: '/',
    delimiter: ':',
    join: (...parts) => posixNormalize(parts.filter(Boolean).join('/')),
    resolve: (...parts) => posixNormalize(parts.reduce((acc, part) => (part.startsWith('/') ? part : `${acc}/${part}`), '/')),
    normalize: posixNormalize,
    dirname: (p) => p.replace(/\/[^/]*$/, '') || '/',
    basename: (p, ext) => {
        const base = p.replace(/^.*\//, '');
        return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base;
    },
    extname: (p) => /(\.[^./]+)$/.exec(p.replace(/^.*\//, ''))?.[1] ?? '',
    isAbsolute: (p) => p.startsWith('/'),
    relative: (_from, to) => to,
    parse(p) {
        const base = p.replace(/^.*\//, '');
        const ext = /(\.[^./]+)$/.exec(base)?.[1] ?? '';
        return { root: p.startsWith('/') ? '/' : '', dir: p.replace(/\/[^/]*$/, ''), base, ext, name: ext ? base.slice(0, -ext.length) : base };
    },
    format: (p) => `${p.dir ? `${p.dir}/` : ''}${p.base ?? `${p.name ?? ''}${p.ext ?? ''}`}`,
};

export const webMockEnv: PreloadEnv = {
    platform: 'web',
    arch: 'web',
    getPathForFile: (file) => file.name,
    toMediaUrl: (path) => path,
};
