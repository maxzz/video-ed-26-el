import { Menu } from 'electron';
import { isMac } from './util.ts';

/**
 * macOS keeps the system application menu (About, Hide, Quit).
 * File through Help live in the renderer menubar on every platform.
 */
export function installSystemMenu() {
    if (!isMac) {
        Menu.setApplicationMenu(null);
        return;
    }

    Menu.setApplicationMenu(Menu.buildFromTemplate([
        { role: 'appMenu' },
    ]));
}
