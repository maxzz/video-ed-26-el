import type { HostMenuAction } from '@shared/ipc-contract.ts';
import { minimizeWindow, quitApp, toggleDevToolsWindow, toggleFullscreenWindow, toggleMaximizeWindow, zoomWindow } from '../window.ts';

type ZoomDirection = Extract<HostMenuAction, { what: 'zoom'; }>['direction'];

export function quit() {
    quitApp();
}

export function minimize() {
    minimizeWindow();
}

export function toggleMaximize() {
    toggleMaximizeWindow();
}

export function toggleFullscreen() {
    toggleFullscreenWindow();
}

export function toggleDevTools() {
    toggleDevToolsWindow();
}

export function zoom(direction: ZoomDirection) {
    zoomWindow(direction);
}
