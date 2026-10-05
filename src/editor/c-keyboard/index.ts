import { observe } from 'jotai-effect';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { keyboardShortcutsVisibleAtom, toggleKeyboardShortcuts } from '@/editor/1-layout/9-state/panels-atoms.ts';
import { initKeyboard } from './7-actions/keyboard-listener.ts';
import { toggleCommandPalette } from './7-actions/command-palette.ts';
import { removeInvalidKeyBindings, updateKeyboardLayout } from './7-actions/key-bindings.ts';

export { KeyboardHosts } from './0-ui/keyboard-hosts.tsx';
export { KeyCombo, KeyCode } from './0-ui/key-combo.tsx';
export { keyboardLayoutMapAtom } from './9-state/keyboard-atoms.ts';
export { toggleCommandPalette } from './7-actions/command-palette.ts';
export { getActionsMap, getModifier, getModifierKeyNames } from './8-lib/actions-map.ts';

function register() {
    registerActions({
        toggleKeyboardShortcuts,
        toggleCommandPalette,
    });

    initKeyboard();

    observe((get) => {
        if (!get(keyboardShortcutsVisibleAtom)) return;
        updateKeyboardLayout();
        removeInvalidKeyBindings();
    }, appStore);
}

export { register as "c-keyboard-register" };
