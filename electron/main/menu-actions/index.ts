import type { HostMenuAction } from '@shared/ipc-contract.ts';
import * as about from './about.ts';
import * as shell from './shell.ts';
import * as windowActions from './window.ts';

/** Every host menu command. IPC forwards here; this file only calls the sibling entry points. */
export async function performHostAction(action: HostMenuAction) {
    switch (action.what) {
        case 'quit': return windowActions.quit();
        case 'minimize': return windowActions.minimize();
        case 'toggleMaximize': return windowActions.toggleMaximize();
        case 'toggleFullscreen': return windowActions.toggleFullscreen();
        case 'toggleDevTools': return windowActions.toggleDevTools();
        case 'zoom': return windowActions.zoom(action.direction);
        case 'showAbout': return about.showAbout();
        case 'openExternal': return shell.openExternal(action.url);
        case 'showItemInFolder': return shell.showItemInFolder(action.path);
        case 'openPath': return shell.openPath(action.path);
        default: {
            const unreachable: never = action;
            return unreachable;
        }
    }
}
