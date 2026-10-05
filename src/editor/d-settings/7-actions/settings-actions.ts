import type { SupportedLanguage } from '@shared/i18n.ts';
import { appStore } from '@/components/4-dialogs/7-0-dialogs/store';
import { customOutDirAtom, setCustomOutDir, userSettings } from '@/editor/0-core/9-state/user-settings.ts';
import { askForFfPath, askForOutDir } from '@/editor/0-core/8-lib/app-dialogs.tsx';
import { settingsVisibleAtom, showAdvancedSettingsAtom, tunerVisibleAtom, type TunerType } from '@/components/2-main/0-all/a-panels-atoms';
import { changeLanguage } from '@/editor/e-i18n/i18n.ts';

export { toggleExportConfirmEnabled } from '@/editor/0-core/7-actions/settings-toggles.ts';

export function openSettings() {
    appStore.set(settingsVisibleAtom, true);
}

export function setShowAdvancedSettings(value: boolean) {
    appStore.set(showAdvancedSettingsAtom, value);
}

export async function setLanguage(language: SupportedLanguage | null) {
    userSettings.language = language;
    await changeLanguage(language);
}

export async function changeCustomFfPath() {
    const newCustomFfPath = await askForFfPath(userSettings.customFfPath);
    if (newCustomFfPath == null) return;
    userSettings.customFfPath = newCustomFfPath;
}

export function clearCustomFfPath() {
    userSettings.customFfPath = undefined;
}

export async function changeOutDir() {
    const newOutDir = await askForOutDir(appStore.get(customOutDirAtom));
    if (newOutDir) setCustomOutDir(newOutDir);
}

export function clearRecentOutDirs() {
    userSettings.recentCustomOutDirs = [];
}

export function toggleStoreProjectInWorkingDir() {
    userSettings.storeProjectInWorkingDir = !userSettings.storeProjectInWorkingDir;
}

export function requestTuner(type: TunerType) {
    appStore.set(settingsVisibleAtom, false);
    appStore.set(tunerVisibleAtom, type);
}
