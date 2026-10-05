import { loadAppInfo } from './editor/0-core/8-lib/main-api.ts';
import { loadUserSettings, userSettings } from './editor/0-core/9-state/user-settings.ts';
import { initI18n } from '@/editor/e-i18n/i18n.ts';
import { initIpcEvents } from './editor/0-core/7-actions/ipc-events.ts';
import { runAppReadyHandlers } from './editor/0-core/7-actions/lifecycle.ts';

/** Everything that must be ready before the first render */
export async function initEditor() {
    await loadAppInfo();
    await loadUserSettings();
    await initI18n(userSettings.language);
    initIpcEvents();
    runAppReadyHandlers();
}
