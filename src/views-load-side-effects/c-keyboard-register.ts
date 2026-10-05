import { observe } from 'jotai-effect';
import { jotaiDefaultStore } from '@/utils/local-utils/9-jotai-default-store';
import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { keyboardShortcutsVisibleAtom, toggleKeyboardShortcuts } from '@/components/2-main/0-all/a-panels-atoms';
import { initKeyboard } from '@/editor/c-keyboard/7-actions/keyboard-listener.ts';
import { toggleCommandPalette } from '@/editor/c-keyboard/7-actions/command-palette.ts';
import { removeInvalidKeyBindings, updateKeyboardLayout } from '@/editor/c-keyboard/7-actions/key-bindings.ts';

export function register_c_keyboard() {
    registerActions({
        toggleKeyboardShortcuts,
        toggleCommandPalette,
    });

    initKeyboard();

    observe((get) => {
        if (!get(keyboardShortcutsVisibleAtom)) return;
        updateKeyboardLayout();
        removeInvalidKeyBindings();
    }, jotaiDefaultStore);
}
