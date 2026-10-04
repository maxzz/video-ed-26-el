import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, dialog, screen, shell, type BrowserWindowConstructorOptions } from 'electron';
import debounce from 'lodash/debounce.js';
import type { HostMenuAction } from '@shared/ipc-contract.ts';
import * as configStore from './config-store.ts';
import { appState } from './app-state.ts';
import { setEventTarget, emitToRenderer } from './events.ts';
import { attachContextMenu } from './context-menu.ts';
import { t } from './i18n.ts';
import { isMac } from './util.ts';

// https://github.com/electron/electron/issues/526#issuecomment-563010533
function getSavedBounds() {
    const bounds = configStore.get('windowBounds');
    const options: BrowserWindowConstructorOptions = {};
    if (bounds) {
        const area = screen.getDisplayMatching(bounds).workArea;
        // use the saved position only if the window is entirely inside the display area
        if (bounds.x >= area.x && bounds.y >= area.y && bounds.x + bounds.width <= area.x + area.width && bounds.y + bounds.height <= area.y + area.height) {
            options.x = bounds.x;
            options.y = bounds.y;
        }
        if (bounds.width <= area.width || bounds.height <= area.height) {
            options.width = bounds.width;
            options.height = bounds.height;
        }
    }
    return { options, isMaximized: bounds?.isMaximized ?? false };
}

export function createWindow() {
    const savedBounds = getSavedBounds();

    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        ...savedBounds.options,
        minWidth: 400,
        minHeight: 300,
        backgroundColor: '#18181b',
        show: false,
        autoHideMenuBar: !isMac,
        webPreferences: {
            preload: fileURLToPath(new URL('../preload/index.cjs', import.meta.url)),
            contextIsolation: true,
            nodeIntegration: false,
            // the preload needs Node's `path` module; the renderer itself has no Node access
            sandbox: false,
            webSecurity: true,
        },
    });

    appState.mainWindow = win;
    setEventTarget(win);
    if (!isMac) {
        win.setMenuBarVisibility(false);
    }

    if (savedBounds.isMaximized) {
        win.maximize();
    }
    win.once('ready-to-show', () => win.show());

    attachContextMenu(win);

    // open target=_blank links in the system browser
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https?:/.test(url)) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    const devUrl = process.env['ELECTRON_RENDERER_URL'];
    if (devUrl) {
        win.loadURL(devUrl);
    } else {
        win.loadFile(fileURLToPath(new URL('../renderer/index.html', import.meta.url)));
    }

    win.on('closed', () => {
        appState.mainWindow = null;
        setEventTarget(null);
    });

    // https://stackoverflow.com/questions/39574636/prompt-to-save-quit-before-closing-window/47434365
    win.on('close', (e) => {
        if (!appState.askBeforeClose) {
            return;
        }
        const choice = dialog.showMessageBoxSync(win, {
            type: 'question',
            buttons: [t('Yes'), t('No')],
            title: t('Confirm quit'),
            message: t('Are you sure you want to quit?'),
        });
        if (choice === 1) {
            e.preventDefault();
        }
    });

    win.on('enter-full-screen', () => emitToRenderer('fullscreenChanged', true));
    win.on('leave-full-screen', () => emitToRenderer('fullscreenChanged', false));

    const saveWindowState = debounce(() => {
        if (win.isDestroyed() || !configStore.get('storeWindowBounds')) {
            return;
        }
        const { x, y, width, height } = win.getNormalBounds();
        configStore.set('windowBounds', { x, y, width, height, isMaximized: win.isMaximized() });
    }, 500);

    win.on('maximize', saveWindowState);
    win.on('unmaximize', saveWindowState);
    win.on('resize', saveWindowState);
    win.on('move', saveWindowState);

    return win;
}

function requireWindow() {
    const win = appState.mainWindow;
    if (!win) {
        throw new Error('No main window');
    }
    return win;
}

/** Allow the HTTP API to respond before the process exits */
export function quitApp() {
    setTimeout(() => app.quit(), 1000);
}

export function minimizeWindow() {
    requireWindow().minimize();
}

export function toggleMaximizeWindow() {
    const win = requireWindow();
    if (win.isMaximized()) {
        win.unmaximize();
    } else {
        win.maximize();
    }
}

export function toggleFullscreenWindow() {
    const win = requireWindow();
    win.setFullScreen(!win.isFullScreen());
}

export function toggleDevToolsWindow() {
    requireWindow().webContents.toggleDevTools();
}

type ZoomDirection = Extract<HostMenuAction, { what: 'zoom'; }>['direction'];

/** One step matches the Electron zoom-in role (about 20%) */
const zoomStep = 1;

export function zoomWindow(direction: ZoomDirection) {
    const contents = requireWindow().webContents;
    if (direction === 'reset') {
        contents.setZoomLevel(0);
        return;
    }
    contents.setZoomLevel(contents.getZoomLevel() + (direction === 'in' ? zoomStep : -zoomStep));
}
