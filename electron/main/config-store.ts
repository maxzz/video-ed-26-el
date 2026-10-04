import Store from 'electron-store';
import { app } from 'electron';
import { join, dirname } from 'node:path';
import type { Config } from '@shared/types.ts';
import { defaultConfig } from '@shared/default-config.ts';
import logger from './logger.ts';
import { isWindows, pathExists } from './util.ts';

const configFileName = 'config.json'; // also hard-coded inside electron-store

let store: Store<Config>;
let customStoragePath: string | undefined;

/** Portable app: use config.json next to the executable if it exists */
async function lookForNeighbourConfigFile() {
    try {
        if (!isWindows || process.windowsStore) {
            return undefined;
        }
        const appExeDir = process.env['PORTABLE_EXECUTABLE_DIR'] || dirname(app.getPath('exe'));
        if (await pathExists(join(appExeDir, configFileName))) {
            return appExeDir;
        }
        return undefined;
    } catch (err) {
        logger.error('Failed to get custom storage path', err);
        return undefined;
    }
}

export function get<T extends keyof Config>(key: T): Config[T] {
    return store.get(key);
}

export function set<T extends keyof Config>(key: T, val: Config[T]) {
    if (val === undefined) {
        store.delete(key);
    } else {
        store.set(key, val);
    }
}

export function reset<T extends keyof Config>(key: T): Config[T] {
    set(key, defaultConfig[key]);
    return defaultConfig[key];
}

export function getAll(): Config {
    return { ...defaultConfig, ...store.store };
}

export const getConfigPath = () => customStoragePath != null ? join(customStoragePath, configFileName) : join(app.getPath('userData'), configFileName);

export async function init({ customConfigDir }: { customConfigDir: string | undefined; }) {
    customStoragePath = customConfigDir ?? await lookForNeighbourConfigFile();
    if (customStoragePath) {
        logger.info('customStoragePath', customStoragePath);
    }

    for (let i = 0; i < 5; i += 1) {
        try {
            store = new Store<Config>({
                defaults: { ...defaultConfig, lastAppVersion: app.getVersion() },
                ...(customStoragePath != null ? { cwd: customStoragePath } : {}),
            });
            return;
        } catch (err) {
            logger.error('Failed to create config store, retrying', err);
            await new Promise((r) => setTimeout(r, 2000));
        }
    }
    throw new Error('Timed out while creating config store');
}
