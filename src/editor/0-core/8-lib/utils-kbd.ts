import i18n from "i18next";
import { isMac, isWindows } from "../7-actions/0-main-api";

export function splitKeyboardKeys(keys: string) {
    return keys.split('+');
}

// source: https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values
// copy([...new Set([temp1, temp2, temp3].map((t) => t.querySelectorAll('tr td:nth-child(3) code:first-child')).flatMap((l) => [...l]).map((code) => code.innerText.replace(/"/g, '')))].join('\n'))
export const shiftModifiers = new Set(['ShiftLeft', 'ShiftRight']);
export const controlModifiers = new Set(['ControlLeft', 'ControlRight']);
export const altModifiers = new Set(['AltLeft', 'AltRight']);
export const metaModifiers = new Set(['MetaLeft', 'MetaRight']);
export const allModifiers = new Set([...shiftModifiers, ...controlModifiers, ...altModifiers, ...metaModifiers]);

export function getMetaKeyName() {
    if (isWindows) {
        return i18n.t('⊞ Win');
    }
    if (isMac) {
        return i18n.t('⌘ Cmd');
    }
    return i18n.t('Meta');
}

const keyCodeToDisplayName: Record<string, string> = {
    Escape: 'Esc',
    Digit1: '1',
    Digit2: '2',
    Digit3: '3',
    Digit4: '4',
    Digit5: '5',
    Digit6: '6',
    Digit7: '7',
    Digit8: '8',
    Digit9: '9',
    Digit0: '0',
    KeyQ: 'Q',
    KeyW: 'W',
    KeyE: 'E',
    KeyR: 'R',
    KeyT: 'T',
    KeyY: 'Y',
    KeyU: 'U',
    KeyI: 'I',
    KeyO: 'O',
    KeyP: 'P',
    KeyA: 'A',
    KeyS: 'S',
    KeyD: 'D',
    KeyF: 'F',
    KeyG: 'G',
    KeyH: 'H',
    KeyJ: 'J',
    KeyK: 'K',
    KeyL: 'L',
    KeyZ: 'Z',
    KeyX: 'X',
    KeyC: 'C',
    KeyV: 'V',
    KeyB: 'B',
    KeyN: 'N',
    KeyM: 'M',
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Semicolon: ';',
    Quote: '\'',
    Backquote: '`',
    Backslash: '\\',
    Comma: ',',
    Period: '.',
    Slash: '/',
    F1: 'F1',
    F2: 'F2',
    F3: 'F3',
    F4: 'F4',
    F5: 'F5',
    F6: 'F6',
    F7: 'F7',
    F8: 'F8',
    F9: 'F9',
    F10: 'F10',
    F11: 'F11',
    F12: 'F12',
    F13: 'F13',
    F14: 'F14',
    F15: 'F15',
    F16: 'F16',
    F17: 'F17',
    F18: 'F18',
    F19: 'F19',
    F20: 'F20',
    F21: 'F21',
    F22: 'F22',
    F23: 'F23',
    F24: 'F24',
    NumpadParenLeft: '(',
    NumpadParenRight: ')',
    PageUp: 'PgUp',
    PageDown: 'PgDn',
    ArrowUp: '↑',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowDown: '↓',
    ControlLeft: 'Ctrl',
    ControlRight: 'Ctrl',
    ShiftLeft: 'Shift',
    ShiftRight: 'Shift',
    AltLeft: 'Alt',
    AltRight: 'Alt',
};

export function getKeyDisplayName(code: string, keyboardLayoutMap: Map<string, string> | undefined): string | undefined {
    if (code === 'MetaLeft' || code === 'MetaRight') {
        return getMetaKeyName();
    }
    if (keyboardLayoutMap == null) {
        return undefined;
    }
    return keyboardLayoutMap.get(code) ?? keyCodeToDisplayName[code] ?? code;
}

export function formatKeybinding(keys: string, keyboardLayoutMap: Map<string, string> | undefined): string | undefined {
    const parts = splitKeyboardKeys(keys);
    const names = parts.map((code) => getKeyDisplayName(code, keyboardLayoutMap));
    if (names.some((n) => n == null)) return undefined;
    return names.join('+');
}
