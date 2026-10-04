import type { BrowserWindow } from 'electron';
import type { MainEventName, MainEvents } from '@shared/ipc-contract.ts';

let target: BrowserWindow | null = null;

export function setEventTarget(window: BrowserWindow | null) {
    target = window;
}

export function emitToRenderer<E extends MainEventName>(event: E, ...args: MainEvents[E]) {
    if (target && !target.isDestroyed()) {
        target.webContents.send(event, ...args);
    }
}
