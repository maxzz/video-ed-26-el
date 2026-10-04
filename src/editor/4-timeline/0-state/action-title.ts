import { atom } from 'jotai';
import type { KeyboardLayoutMap } from '@/editor/0-core/2-lib/types.ts';
import { appStore } from '@/editor/0-core/0-state/store.ts';
import { userSettingsAtom } from '@/editor/0-core/0-state/user-settings.ts';
import { formatKeybinding } from '@/editor/0-core/2-lib/util.ts';

// Port of upstream useActionTitle: appends the key binding of an action to a button title

const keyboardLayoutMapAtom = atom<KeyboardLayoutMap | undefined>(undefined);

type NavigatorWithKeyboard = Navigator & { keyboard?: { getLayoutMap: () => Promise<KeyboardLayoutMap>; }; };

(navigator as NavigatorWithKeyboard).keyboard?.getLayoutMap()
    .then((map) => appStore.set(keyboardLayoutMapAtom, map))
    .catch((err: unknown) => console.warn('Failed to get keyboard layout map', err));

const keyBindingByActionAtom = atom((get) => Object.fromEntries(get(userSettingsAtom).keyBindings.map((binding) => [binding.action, binding])));

export const actionTitleAtom = atom((get) => {
    const keyBindingByAction = get(keyBindingByActionAtom);
    const keyboardLayoutMap = get(keyboardLayoutMapAtom);
    return (title: string, action: string): string => {
        const binding = keyBindingByAction[action];
        if (binding == null) return title;
        const formatted = formatKeybinding(binding.keys, keyboardLayoutMap);
        if (formatted == null) return title;
        return `${title} (${formatted})`;
    };
});
