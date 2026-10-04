import type { KeyBinding, KeyboardAction } from '@shared/types.ts';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { userSettingsAtom } from '@/editor/0-core/9-state/user-settings.ts';
import { isAnyDialogOpenAtom } from '@/editor/0-core/9-state/dialogs.ts';
import { getKeyupAction, hasAction, runAction } from '@/editor/0-core/7-actions/actions-registry.ts';
import { allModifiers, altModifiers, controlModifiers, metaModifiers, shiftModifiers } from '@/editor/0-core/8-lib/util.ts';
import { anyPanelOpenAtom, closeExportConfirm, commandPaletteOpenAtom, exportConfirmOpenAtom } from '@/editor/1-layout/9-state/panels-atoms.ts';
import { creatingBindingAtom } from '../9-state/keyboard-atoms.ts';
import { addRecordedKey, updateKeyboardLayout } from './key-bindings.ts';
import { toggleCommandPalette } from './command-palette.ts';

// Port of upstream hooks/useKeyboard.ts, installed once at startup instead of in a component effect.
//
// Keyboard testing points (from upstream):
// - ctrl/cmd + c/v should work in inputs
// - Keyboard actions should not trigger when focus is inside a dialog, or when focusing inputs, switches etc.
// - Different keyboard layouts (chinese, french) should work because the key code is the same.
// - Go to timecode (`g`) shouldn't insert the letter `g` into the input box. Same for all detect* actions.
// - Seek (autorepeat) and acceleration factor should reset after keyup.
// - The bind new key dialog should not close when its key binding (shift+slash) is triggered.

let keyBindingsByKeyCode: Record<string, KeyBinding[]> = {};
let indexedKeyBindings: readonly KeyBinding[] | undefined;
/** Set when an action triggered with alt held, so that releasing alt doesn't open the window menu */
let altActionTriggered = false;

function getMatchingAction(e: KeyboardEvent): KeyboardAction | undefined {
    const { keyBindings } = appStore.get(userSettingsAtom);
    if (keyBindings !== indexedKeyBindings) {
        indexedKeyBindings = keyBindings;
        keyBindingsByKeyCode = {};
        for (const kb of keyBindings) {
            for (const key of kb.keys.split('+')) {
                (keyBindingsByKeyCode[key] ??= []).push(kb);
            }
        }
    }

    // only use the first one if there are multiple matches (shouldn't happen anyway)
    const match = (keyBindingsByKeyCode[e.code] ?? []).find((kb) => {
        const kbKeys = kb.keys.split('+');
        const has = (modifiers: Set<string>) => kbKeys.some((key) => modifiers.has(key));
        return has(controlModifiers) === e.ctrlKey
            && has(shiftModifiers) === e.shiftKey
            && has(altModifiers) === e.altKey
            && has(metaModifiers) === e.metaKey;
    });
    return match?.action;
}

const editables = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

function isEditable(target: EventTarget | null) {
    return target instanceof Element && target.closest(editables) != null;
}

const keyHandlingWidgets = [
    editables,
    '[role="dialog"]', '[role="alertdialog"]', '[role="menu"]', '[role="listbox"]', '[role="slider"]',
    '[role="tablist"]', '[role="radiogroup"]', '[role="tree"]', '[role="grid"]', '[cmdk-root]',
].join(',');

/** True when the focused element handles keys itself (inputs, menus, sliders, dialogs...) */
function isKeyHandlingTarget(target: EventTarget | null) {
    if (!(target instanceof Element) || target === document.body) return false;
    return target.closest(keyHandlingWidgets) != null;
}

/** Ctrl/Cmd+K or Ctrl/Cmd+Shift+P */
function isCommandPaletteHotkey(e: KeyboardEvent) {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod || e.altKey) return false;
    return (e.code === 'KeyK' && !e.shiftKey) || (e.code === 'KeyP' && e.shiftKey);
}

function onKeyDown(e: KeyboardEvent) {
    if (appStore.get(creatingBindingAtom) != null) {
        // Escape is left to the dialog so that it can be closed; a confirmation on top of it gets its keys too
        if (e.code === 'Escape' || appStore.get(isAnyDialogOpenAtom)) return;
        addRecordedKey(e.code);
        e.preventDefault();
        e.stopPropagation();
        return;
    }

    if (allModifiers.has(e.code)) return;

    if (isCommandPaletteHotkey(e)) {
        const paletteOpen = appStore.get(commandPaletteOpenAtom);
        if (paletteOpen || (!appStore.get(isAnyDialogOpenAtom) && !appStore.get(anyPanelOpenAtom))) {
            toggleCommandPalette();
            e.preventDefault();
            e.stopPropagation();
        }
        return;
    }

    const action = getMatchingAction(e);

    if (appStore.get(exportConfirmOpenAtom)) {
        // Escape closes the export confirm screen no matter what's focused
        if (e.code === 'Escape') {
            closeExportConfirm();
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        // don't allow other key actions than export while the export confirm screen is open
        if (action !== 'export' || isEditable(e.target) || appStore.get(isAnyDialogOpenAtom)) return;
    } else {
        if (isKeyHandlingTarget(e.target)) return;
        if (appStore.get(isAnyDialogOpenAtom) || appStore.get(anyPanelOpenAtom)) return;
    }

    if (action == null || !hasAction(action)) return;

    runAction(action);
    e.preventDefault();
    e.stopPropagation();
    if (e.altKey) altActionTriggered = true;
}

function onKeyUp(e: KeyboardEvent) {
    // https://github.com/mifi/lossless-cut/issues/2180
    if (altActionTriggered && (e.code === 'AltLeft' || e.code === 'AltRight')) {
        e.preventDefault();
        altActionTriggered = false;
    }

    if (allModifiers.has(e.code)) return;

    const action = getMatchingAction(e);
    if (action != null) getKeyupAction(action)?.();
}

let initialized = false;

/** Installs the global keyboard listeners once */
export function initKeyboard() {
    if (initialized || typeof document === 'undefined') return;
    initialized = true;

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    updateKeyboardLayout();
    window.addEventListener('focus', updateKeyboardLayout);
}
