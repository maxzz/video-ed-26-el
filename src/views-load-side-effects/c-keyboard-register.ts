import { observe } from "jotai-effect";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { registerActions } from "@/editor/0-core/7-actions/kbd-actions";
import { keyboardShortcutsVisibleAtom, tmcmd_toggleKeyboardShortcuts } from "@/components/2-main/0-all/a-panels-atoms";
import { initKeyboard } from "@/editor/c-keyboard/7-actions/keyboard-listener";
import { tmcmd_toggleCommandPalette } from "@/editor/c-keyboard/7-actions/command-palette";
import { removeInvalidKeyBindings, updateKeyboardLayout } from "@/editor/c-keyboard/7-actions/key-bindings";

export function register_c_keyboard() {
    registerActions({
        toggleKeyboardShortcuts: tmcmd_toggleKeyboardShortcuts,
        toggleCommandPalette: tmcmd_toggleCommandPalette,
    });

    initKeyboard();

    observe((get) => {
        if (!get(keyboardShortcutsVisibleAtom)) return;
        updateKeyboardLayout();
        removeInvalidKeyBindings();
    }, jotaiDefaultStore);
}
