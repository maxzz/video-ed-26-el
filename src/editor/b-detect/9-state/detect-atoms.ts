import { atom } from 'jotai';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { type FfmpegDialog, parameters as allFfmpegParameters } from '@/editor/0-core/8-lib/ffmpeg/ffmpeg-parameters.ts';

export type ParameterDialogParameters = Record<string, string>;

/** Last used parameters of the detection dialogs, remembered while the app is running (upstream useSegments ffmpegParameters) */
export const ffmpegParametersAtom = atom<Record<FfmpegDialog, ParameterDialogParameters>>(
    Object.fromEntries(Object.entries(allFfmpegParameters).map(([dialogType, parameters]) => [
        dialogType,
        Object.fromEntries(Object.entries(parameters).map(([key, { value }]) => [key, value])),
    ])) as Record<FfmpegDialog, ParameterDialogParameters>,
);

export const getFfmpegParameters = (dialogType: FfmpegDialog) => appStore.get(ffmpegParametersAtom)[dialogType];

export function setFfmpegParametersForDialog(dialogType: FfmpegDialog, newParams: ParameterDialogParameters) {
    appStore.set(ffmpegParametersAtom, (existing) => ({ ...existing, [dialogType]: { ...existing[dialogType], ...newParams } }));
}
