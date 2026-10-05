import { atom } from 'jotai';
import { observe } from 'jotai-effect';
import { appStore } from '@/components/4-dialogs/7-0-dialogs/store';
import { userSettings, userSettingsAtom } from '@/editor/0-core/9-state/user-settings.ts';

import { type SegmentTags } from '@/editor/0-core/8-lib/types.ts';
import { onFileReset } from '@/editor/0-core/7-actions/lifecycle.ts';

// Visibility of the app panels/sheets/dialogs. Shared because they are opened from menus, keyboard actions and buttons of other features.

export const streamsSelectorShownAtom = atom(false);
export const concatDialogOpenAtom = atom(false);
export const exportConfirmOpenAtom = atom(false);
export const lastCommandsVisibleAtom = atom(false);
export const settingsVisibleAtom = atom(false);
export const keyboardShortcutsVisibleAtom = atom(false);
export const commandPaletteOpenAtom = atom(false);

export type TunerType = 'wheelSensitivity' | 'keyboardNormalSeekSpeed' | 'keyboardSeekSpeed2' | 'keyboardSeekSpeed3' | 'keyboardSeekAccFactor' | 'waveformHeight';
export const tunerVisibleAtom = atom<TunerType | undefined>(undefined);

/** Segment index whose tags are being edited in the segment tags dialog */
export const editingSegmentTagsSegmentIndexAtom = atom<number | undefined>(undefined);
export const editingSegmentTagsAtom = atom<SegmentTags | undefined>(undefined);

export const showAdvancedSettingsAtom = atom(!userSettings.simpleMode);

observe((get, set) => {
    set(showAdvancedSettingsAtom, !get(userSettingsAtom).simpleMode);
}, appStore);

export const fullscreenAtom = atom(false);
/** Time under the mouse on the timeline */
export const hoveringTimeAtom = atom<number | undefined>(undefined);

/** True when a modal UI that should block global keyboard shortcuts is open */
export const anyPanelOpenAtom = atom(
    (get) => (
        get(concatDialogOpenAtom) ||
        get(lastCommandsVisibleAtom) ||
        get(settingsVisibleAtom) ||
        get(keyboardShortcutsVisibleAtom) ||
        get(streamsSelectorShownAtom) ||
        get(commandPaletteOpenAtom) ||
        get(editingSegmentTagsSegmentIndexAtom) != null)
);

export function closeExportConfirm() { appStore.set(exportConfirmOpenAtom, false); }
export function toggleSettings() { appStore.set(settingsVisibleAtom, (v) => !v); }
export function toggleLastCommands() { appStore.set(lastCommandsVisibleAtom, (v) => !v); }
export function toggleKeyboardShortcuts() { appStore.set(keyboardShortcutsVisibleAtom, (v) => !v); }
export function toggleStreamsSelector() { appStore.set(streamsSelectorShownAtom, (v) => !v); }

onFileReset(() => {
    appStore.set(streamsSelectorShownAtom, false);
    appStore.set(exportConfirmOpenAtom, false);
});
