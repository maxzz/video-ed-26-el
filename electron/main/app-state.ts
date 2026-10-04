import type { BrowserWindow } from 'electron';
import type { MenuState } from '@shared/ipc-contract.ts';

/** Mutable main-process state shared between window, menu, IPC handlers and the HTTP API */
export const appState = {
    mainWindow: null as BrowserWindow | null,
    askBeforeClose: false,
    rendererReady: false,
    filesToOpen: [] as string[],
    newVersion: undefined as string | undefined,
    disableNetworking: false,
    lossyMode: undefined as { videoEncoder: 'libx264' | 'libx265' | 'libsvtav1'; } | undefined,
    menuState: { isFileOpened: false, hasSegments: false, canUndo: false, canRedo: false } as MenuState,
};
