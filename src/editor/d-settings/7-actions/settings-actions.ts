import { type SupportedLanguage } from "@shared/i18n";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { customOutDirAtom, setCustomOutDir, userSettings } from "@/editor/0-core/9-state/user-settings";
import { askForFfPath } from "@/components/4-dialogs/7-1-dialogs/03-ask-for-ff-path";
import { askForOutDir } from "@/components/4-dialogs/7-1-dialogs/02-ask-for-out-dir";
import { settingsVisibleAtom, showAdvancedSettingsAtom, tunerVisibleAtom, type TunerType } from "@/components/2-main/0-all/a-panels-atoms";
import { changeLanguage } from "@/editor/e-i18n/i18n";

export { toggleExportConfirmEnabled } from "@/editor/0-core/7-actions/settings-toggles";

export function openSettings() {
    jotaiDefaultStore.set(settingsVisibleAtom, true);
}

export function setShowAdvancedSettings(value: boolean) {
    jotaiDefaultStore.set(showAdvancedSettingsAtom, value);
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
    const newOutDir = await askForOutDir(jotaiDefaultStore.get(customOutDirAtom));
    if (newOutDir) setCustomOutDir(newOutDir);
}

export function clearRecentOutDirs() {
    userSettings.recentCustomOutDirs = [];
}

export function toggleStoreProjectInWorkingDir() {
    userSettings.storeProjectInWorkingDir = !userSettings.storeProjectInWorkingDir;
}

export function requestTuner(type: TunerType) {
    jotaiDefaultStore.set(settingsVisibleAtom, false);
    jotaiDefaultStore.set(tunerVisibleAtom, type);
}
