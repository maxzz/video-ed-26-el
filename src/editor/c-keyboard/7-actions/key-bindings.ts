import i18n from 'i18next';
import type { KeyBinding, KeyboardAction } from '@shared/types.ts';
import { jotaiDefaultStore } from '@/utils/local-utils/9-jotai-default-store.ts';
import { resetUserSetting, userSettings } from '@/editor/0-core/9-state/user-settings.ts';
import { confirmDialog } from '@/components/4-dialogs/7-1-dialogs/00-app-dialogs.tsx';
import type { KeyboardLayoutMap } from '@/editor/0-core/8-lib/9-types-core.ts';
import { creatingBindingAtom, keyboardLayoutMapAtom, recordedKeysAtom } from '../9-state/keyboard-atoms.ts';
import { getActionsMap } from '../8-lib/actions-map.ts';

type NavigatorWithKeyboard = Navigator & { keyboard?: { getLayoutMap(): Promise<KeyboardLayoutMap>; }; };

export async function updateKeyboardLayout() {
    try {
        const layoutMap = await (navigator as NavigatorWithKeyboard).keyboard?.getLayoutMap();
        jotaiDefaultStore.set(keyboardLayoutMapAtom, layoutMap ?? new Map());
    } catch (err) {
        console.warn('Unable to get keyboard layout map', err);
        jotaiDefaultStore.set(keyboardLayoutMapAtom, new Map());
    }
}

export function setKeyBindings(update: (existing: KeyBinding[]) => KeyBinding[]) {
    userSettings.keyBindings = update(userSettings.keyBindings);
}

export async function resetKeyBindings() {
    // double confirmation like upstream
    if (!(await confirmDialog({ description: i18n.t('Are you sure you want to reset all keyboard bindings?') }))) return;
    if (!(await confirmDialog({ description: i18n.t('Are you sure you want to reset all keyboard bindings?') }))) return;
    await resetUserSetting('keyBindings');
}

/** Cleans up bindings of renamed/removed actions, so they don't block the user from rebinding */
export function removeInvalidKeyBindings() {
    const actionsMap = getActionsMap();
    const valid = userSettings.keyBindings.filter(({ action }) => actionsMap[action]);
    if (valid.length !== userSettings.keyBindings.length) {
        console.log(`Auto deleting ${userSettings.keyBindings.length - valid.length} invalid key binding(s)`);
        userSettings.keyBindings = valid;
    }
}

export async function deleteKeyBinding({ action, keys }: KeyBinding) {
    if (!(await confirmDialog({ description: i18n.t('Are you sure?'), danger: true }))) return;
    console.log('Delete key binding', action, keys);
    setKeyBindings((existing) => existing.filter((b) => !(b.keys === keys && b.action === action)));
}

export function startCreatingBinding(action: KeyboardAction) {
    jotaiDefaultStore.set(recordedKeysAtom, []);
    jotaiDefaultStore.set(creatingBindingAtom, action);
}

export function stopCreatingBinding() {
    jotaiDefaultStore.set(creatingBindingAtom, undefined);
}

export function addRecordedKey(code: string) {
    jotaiDefaultStore.set(recordedKeysAtom, (old) => [...new Set([...old, code])]);
}

export function clearRecordedKeys() {
    jotaiDefaultStore.set(recordedKeysAtom, []);
}

export async function confirmNewKeyBinding(action: KeyboardAction, keys: string[]) {
    const keysStr = keys.join('+');
    console.log('New key binding', action, keysStr);

    const duplicate = userSettings.keyBindings.find((b) => b.keys === keysStr);
    if (duplicate) {
        const isConfirmed = await confirmDialog({
            confirmButtonText: i18n.t('Replace'),
            description: i18n.t('Combination is already bound to "{{alreadyBoundKey}}". Do you want to replace the existing binding?', { alreadyBoundKey: getActionsMap()[duplicate.action]?.name }),
        });
        if (!isConfirmed) return;
    }

    setKeyBindings((existing) => [...(duplicate ? existing.filter((b) => b.keys !== keysStr) : existing), { action, keys: keysStr }]);
    stopCreatingBinding();
}
