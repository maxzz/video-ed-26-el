import { loadAppInfo } from "./editor/0-core/7-actions/0-main-api";
import { loadUserSettings, userSettings } from "./editor/0-core/9-state/user-settings";
import { initI18n } from "@/editor/e-i18n/i18n";
import { initIpcEvents } from "./editor/0-core/7-actions/3-init-ipc-events";
import { runAppReadyHandlers } from "./editor/0-core/7-actions/2-lifecycle";

/** Everything that must be ready before the first render */
export async function initEditor() {
    await loadAppInfo();
    await loadUserSettings();
    await initI18n(userSettings.language);
    initIpcEvents();
    runAppReadyHandlers();
}
