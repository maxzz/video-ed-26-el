import { subscribe } from 'valtio';
import { appSettings } from '@/store/1-ui-settings';
import { userSettings } from '@/editor/0-core/9-state/user-settings.ts';

// The template theme (appSettings.theme) is the source of truth; LosslessCut's darkMode setting mirrors it
// so ported code that reads userSettings.darkMode keeps working.

function isDark() {
    return appSettings.theme === 'dark'
        || (appSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

export function initThemeSync() {
    userSettings.darkMode = isDark();
    subscribe(appSettings, () => {
        const dark = isDark();
        if (userSettings.darkMode !== dark) userSettings.darkMode = dark;
    });
}

export function toggleDarkMode() {
    appSettings.theme = isDark() ? 'light' : 'dark';
}
