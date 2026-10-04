import { atom } from 'jotai';
import type { KeyboardAction } from '@shared/types.ts';
import type { KeyboardLayoutMap } from '@/editor/0-core/2-lib/types.ts';

/** Physical key code -> character on the user's keyboard layout. Undefined until loaded */
export const keyboardLayoutMapAtom = atom<KeyboardLayoutMap | undefined>(undefined);

/** Action for which a new key binding is being recorded (the "Bind new key to action" dialog) */
export const creatingBindingAtom = atom<KeyboardAction | undefined>(undefined);

/** Key codes pressed while recording a new binding */
export const recordedKeysAtom = atom<string[]>([]);

export const shortcutsSearchAtom = atom('');
