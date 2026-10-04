import type { HostMenuAction } from '@shared/ipc-contract.ts';
import { mainApi } from '@/editor/0-core/8-lib/main-api.ts';

type ZoomDirection = Extract<HostMenuAction, { what: 'zoom'; }>['direction'];

export function quit() {
    return mainApi.performHostAction({ what: 'quit' });
}

export function minimize() {
    return mainApi.performHostAction({ what: 'minimize' });
}

export function toggleMaximize() {
    return mainApi.performHostAction({ what: 'toggleMaximize' });
}

export function toggleFullscreen() {
    return mainApi.performHostAction({ what: 'toggleFullscreen' });
}

export function toggleDevTools() {
    return mainApi.performHostAction({ what: 'toggleDevTools' });
}

export function showAbout() {
    return mainApi.performHostAction({ what: 'showAbout' });
}

export function zoom(direction: ZoomDirection) {
    return mainApi.performHostAction({ what: 'zoom', direction });
}

export function openExternal(url: string) {
    return mainApi.performHostAction({ what: 'openExternal', url });
}

export function showItemInFolder(path: string) {
    return mainApi.performHostAction({ what: 'showItemInFolder', path });
}

export function openPath(path: string) {
    return mainApi.performHostAction({ what: 'openPath', path });
}
