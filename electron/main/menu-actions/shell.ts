import { openExternalUrl, openPath as openPathImpl, showItemInFolder as showItemInFolderImpl } from '../shell.ts';

export function openExternal(url: string) {
    return openExternalUrl(url);
}

export function showItemInFolder(path: string) {
    showItemInFolderImpl(path);
}

export function openPath(path: string) {
    return openPathImpl(path);
}
