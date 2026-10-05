import { observe } from 'jotai-effect';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { keyboardShortcutsVisibleAtom, toggleKeyboardShortcuts } from '@/editor/1-layout/9-state/panels-atoms.ts';
import { initKeyboard } from '@/editor/c-keyboard/7-actions/keyboard-listener.ts';
import { toggleCommandPalette } from '@/editor/c-keyboard/7-actions/command-palette.ts';
import { removeInvalidKeyBindings, updateKeyboardLayout } from '@/editor/c-keyboard/7-actions/key-bindings.ts';

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
