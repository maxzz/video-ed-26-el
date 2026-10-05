import i18n from 'i18next';
import type { ModifierKey } from '@shared/types.ts';
import { getMetaKeyName } from '@/editor/0-core/8-lib/utils-kbd.ts';

// Port of upstream useTimelineScroll helpers

export const keyMap = {
    ctrl: 'ctrlKey',
    shift: 'shiftKey',
    alt: 'altKey',
    meta: 'metaKey',
} as const;

export const getModifierKeyNames = () => ({
    ctrl: i18n.t('Ctrl'),
    shift: i18n.t('Shift'),
    alt: i18n.t('Alt'),
    meta: getMetaKeyName(),
});

export const getModifier = (key: ModifierKey) => getModifierKeyNames()[key];

export function isModifierPressed(e: { ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean; }, key: ModifierKey) {
    return e[keyMap[key]];
}
