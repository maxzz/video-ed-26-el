// Per-file lifecycle hooks. Each feature registers how to reset its own per-file state
// (instead of one resetState that knows every atom in the app).

type Handler = () => void;

/**
 * Feature modules are evaluated before initEditor() has loaded app info, user settings and i18n.
 * Startup work that needs them registers here; it runs right after initEditor(), or immediately if already done.
 */
export function onAppReady(handler: Handler) {
    if (appReady) {
        handler();
    } else {
        appReadyHandlers.push(handler);
    }
}

const appReadyHandlers: Handler[] = [];
let appReady = false;

export function runAppReadyHandlers() {
    appReady = true;
    for (const handler of appReadyHandlers.splice(0)) {
        try {
            handler();
        } catch (err) {
            console.error('App ready handler failed', err);
        }
    }
}

//---------------------------------------------------------------------------

const resetHandlers = new Set<Handler>();

/** Called by closeFile/loadMedia before a new file is loaded. Returns an unregister function */
export function onFileReset(handler: Handler) {
    resetHandlers.add(handler);
    return () => { resetHandlers.delete(handler); };
}

export function resetAllFileState() {
    console.log('State reset');

    for (const handler of resetHandlers) {
        try {
            handler();
        } catch (err) {
            console.error('File state reset handler failed', err);
        }
    }
}
