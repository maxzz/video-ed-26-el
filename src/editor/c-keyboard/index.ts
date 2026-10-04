import { observe } from 'jotai-effect';
import { appStore } from '@/editor/0-core/0-state/store.ts';
import { registerActions } from '@/editor/0-core/1-actions/actions-registry.ts';
import { keyboardShortcutsVisibleAtom, toggleKeyboardShortcuts } from '@/editor/1-layout/0-state/panels-atoms.ts';
import { initKeyboard } from './1-actions/keyboard-listener.ts';
import { toggleCommandPalette } from './1-actions/command-palette.ts';
import { removeInvalidKeyBindings, updateKeyboardLayout } from './1-actions/key-bindings.ts';

export { KeyboardHosts } from './3-ui/keyboard-hosts.tsx';
export { KeyCombo, KeyCode } from './3-ui/key-combo.tsx';
export { keyboardLayoutMapAtom } from './0-state/keyboard-atoms.ts';
export { toggleCommandPalette } from './1-actions/command-palette.ts';
export { getActionsMap, getModifier, getModifierKeyNames } from './2-lib/actions-map.ts';

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
