import { atom } from "jotai";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { type FfmpegDialog, parameters as allFfmpegParameters } from "@/editor/0-core/8-lib/ffmpeg/ffmpeg-parameters";

export type ParameterDialogParameters = Record<string, string>;

/** Last used parameters of the detection dialogs, remembered while the app is running (upstream useSegments ffmpegParameters) */
export const ffmpegParametersAtom = atom<Record<FfmpegDialog, ParameterDialogParameters>>(
    Object.fromEntries(Object.entries(allFfmpegParameters).map(
        ([dialogType, parameters]) => [
            dialogType,
            Object.fromEntries(Object.entries(parameters).map(([key, { value }]) => [key, value])),
        ]
    )) as Record<FfmpegDialog, ParameterDialogParameters>,
);

export function getFfmpegParameters(dialogType: FfmpegDialog) {
    return jotaiDefaultStore.get(ffmpegParametersAtom)[dialogType];
}

export function setFfmpegParametersForDialog(dialogType: FfmpegDialog, newParams: ParameterDialogParameters) {
    jotaiDefaultStore.set(ffmpegParametersAtom, (existing) => ({ ...existing, [dialogType]: { ...existing[dialogType], ...newParams } }));
}
