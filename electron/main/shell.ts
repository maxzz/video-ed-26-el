import { shell } from 'electron';
import { appState } from './app-state.ts';
import logger from './logger.ts';

export async function openExternalUrl(url: string) {
    if (appState.disableNetworking && /^https?:/.test(url)) {
        logger.warn('openExternal blocked because networking is disabled', url);
        return;
    }
    await shell.openExternal(url);
}

export function showItemInFolder(path: string) {
    shell.showItemInFolder(path);
}

export async function openPath(path: string) {
    const error = await shell.openPath(path);
    if (error) {
        logger.warn('openPath failed', path, error);
    }
}
