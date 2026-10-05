import { mainApi, mainEvents } from '../8-lib/main-api.ts';
import { runAction } from './kbd-actions.ts';

let initialized = false;

/** Subscribes to main process events once, at startup (not in a React effect) */
export function initIpcEvents() {
    if (initialized) return;
    initialized = true;

    // native menu and context menu
    mainEvents.on('action', (name, args) => {
        runAction(name, ...(args ?? []));
    });

    // HTTP API
    mainEvents.on('apiAction', async ({ id, action, args }) => {
        console.log('API action:', action, args);
        try {
            const found = await runAction(action, ...(args ?? []));
            if (!found) console.error(`Action not found: ${action}`);
        } finally {
            await mainApi.apiActionResponse(id);
        }
    });

    // files from the command line, second instance or macOS open-file
    mainEvents.on('openFiles', (paths) => {
        runAction('openFiles', paths);
    });

    // default drop handler to prevent new electron window from popping up https://github.com/electron/electron/issues/39839
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('dragend', (e) => e.preventDefault());
    document.body.addEventListener('drop', (e) => e.preventDefault());
}
