import { Menu, type BrowserWindow } from 'electron';

// https://github.com/electron/electron/issues/4068#issuecomment-274159726
export function attachContextMenu(window: BrowserWindow) {
    const selectionMenu = Menu.buildFromTemplate([
        { role: 'copy' },
        { type: 'separator' },
        { role: 'selectAll' },
    ]);

    const inputMenu = Menu.buildFromTemplate([
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { role: 'selectAll' },
    ]);

    window.webContents.on('context-menu', (_e, { selectionText, isEditable }) => {
        if (isEditable) {
            inputMenu.popup({ window });
        } else if (selectionText && selectionText.trim() !== '') {
            selectionMenu.popup({ window });
        }
    });
}
