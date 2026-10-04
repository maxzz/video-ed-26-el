import { atom } from 'jotai';
import type { AppInfo } from '@shared/ipc-contract.ts';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { userSettings, userSettingsAtom } from '@/editor/0-core/9-state/user-settings.ts';
import { getAppInfo, getFfCommandLine } from '@/editor/0-core/8-lib/main-api.ts';
import { isCuttingEnd, isCuttingStart } from '@/editor/0-core/8-lib/ffmpeg/ffmpeg.ts';
import { encBitrateAtom, fileDurationAtom, ffmpegCommandLogAtom } from '@/editor/2-file/9-state/file-atoms.ts';
import { segmentsToExportAtom } from '@/editor/5-segments/9-state/segments-store.ts';
import { defaultCutFileTemplate, defaultCutMergedFileTemplate, defaultMergedFileTemplate } from '../8-lib/output-name-template.ts';

// Last commands log (upstream App.tsx appendLastCommandsLog/appendFfmpegCommandLog)

export function appendLastCommandsLog(command: string) {
    appStore.set(ffmpegCommandLogAtom, (old) => [...old, { command, time: new Date() }]);
}

export function appendFfmpegCommandLog(args: string[]) {
    appendLastCommandsLog(getFfCommandLine('ffmpeg', args));
}

export type LossyMode = AppInfo['lossyMode'];

/** Set from the command line (--lossy-mode), see electron/main/cli.ts */
export function getLossyMode(): LossyMode {
    try {
        return getAppInfo().lossyMode;
    } catch {
        return undefined;
    }
}

export const areWeCuttingAtom = atom((get) => {
    const fileDuration = get(fileDurationAtom);
    return get(segmentsToExportAtom).some(({ start, end }) => isCuttingStart(start) || isCuttingEnd(end, fileDuration));
});

export const needSmartCutAtom = atom((get) => get(areWeCuttingAtom) && get(userSettingsAtom).enableSmartCut);

export const isEncodingAtom = atom((get) => get(needSmartCutAtom) || getLossyMode() != null);

export const willMergeAtom = atom((get) => get(segmentsToExportAtom).length > 1 && get(userSettingsAtom).autoMerge);

export function setEncBitrate(value: number | undefined) {
    appStore.set(encBitrateAtom, value);
}

/** "Show advanced options" in the export confirm sheet, undefined follows simple mode */
export const exportShowAdvancedAtom = atom<boolean | undefined>(undefined);
export const effectiveExportShowAdvancedAtom = atom((get) => get(exportShowAdvancedAtom) ?? !get(userSettingsAtom).simpleMode);

// Output file name templates (config keys: outSegTemplate, mergedFileTemplate, mergedFilesTemplate)

export const cutFileTemplateOrDefaultAtom = atom((get) => get(userSettingsAtom).outSegTemplate ?? defaultCutFileTemplate);
export const cutMergedFileTemplateOrDefaultAtom = atom((get) => get(userSettingsAtom).mergedFileTemplate ?? defaultCutMergedFileTemplate);
export const mergedFileTemplateOrDefaultAtom = atom((get) => get(userSettingsAtom).mergedFilesTemplate ?? defaultMergedFileTemplate);

export function setCutFileTemplate(template: string | undefined) {
    userSettings.outSegTemplate = template;
}

export function setCutMergedFileTemplate(template: string | undefined) {
    userSettings.mergedFileTemplate = template;
}

export function setMergedFileTemplate(template: string | undefined) {
    userSettings.mergedFilesTemplate = template;
}
