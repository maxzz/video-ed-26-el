import { atom, type Getter } from 'jotai';
import type { UniqueIdentifier } from '@dnd-kit/core';
import type { FileFfprobeMeta } from '@/editor/0-core/8-lib/ffmpeg/ffmpeg.ts';
import type { FileStats } from '@/editor/0-core/8-lib/types.ts';
import { customOutDirAtom, maxLabelLengthAtom, userSettingsAtom } from '@/editor/0-core/9-state/user-settings.ts';
import { getOutDir } from '@/editor/0-core/8-lib/util.ts';
import { parseRatio } from '@shared/util';
import { batchFilePathsAtom, batchFilesAtom, exportCountAtom, fileFormatAtom, isCustomFormatSelectedAtom } from '@/editor/2-file/9-state/file-atoms.ts';
import { concatDialogOpenAtom } from '@/components/2-main/0-all/a-panels-atoms';
import { defaultMergedFileTemplate, generateMergedFileNames, type GeneratedOutFileNames } from '@/editor/7-export/8-lib/output-name-template.ts';

// Merge files dialog (upstream ConcatDialog). All state here is preserved when the dialog is closed, except the files meta.

export interface ConcatFileMeta {
    ffprobeMeta: FileFfprobeMeta;
    stats: FileStats;
}

type ProblemValue = string | number | undefined;

export type Problem = { index: number; } & (
    | { type: 'extraneous'; }
    | { type: 'parameter_mismatch'; key: string; values: [ProblemValue, ProblemValue]; }
);

export const concatIncludeAllStreamsAtom = atom(false);
export const concatClearBatchFilesAfterConcatAtom = atom(false);
const concatReadFileMetaCheckedAtom = atom(false);
export const concatFilesMetaAtom = atom<Record<string, ConcatFileMeta>>({});
export const concatUniqueSuffixAtom = atom(Date.now());
export const concatOptionsOpenAtom = atom(false);
/** Path of the file whose mismatches are shown */
export const concatMismatchesPathAtom = atom<string | undefined>(undefined);

/**
 * For simple mode, we want to auto-generate the merged file template based on the first file, so we don't store it in user settings,
 * as that could overwrite what they already have there https://github.com/mifi/lossless-cut/issues/2927#issuecomment-4773155758
 */
export const concatTempMergedFileTemplateAtom = atom<string | undefined>(defaultMergedFileTemplate);

/** Preview of the output file name for the current template */
export const concatGeneratedFileNamesAtom = atom<GeneratedOutFileNames | undefined>(undefined);

export const simpleModeAtom = atom((get) => get(userSettingsAtom).simpleMode);
export const outFormatLockedAtom = atom((get) => get(userSettingsAtom).outFormatLocked);

/** Compatibility check is always on in simple mode */
export const concatEnableReadFileMetaAtom = atom(
    (get) => get(simpleModeAtom) || get(concatReadFileMetaCheckedAtom),
    (_get, set, checked: boolean) => set(concatReadFileMetaCheckedAtom, checked),
);

export const isConcatDialogShownAtom = atom((get) => get(batchFilesAtom).length > 0 && get(concatDialogOpenAtom));

export const concatFirstPathAtom = atom((get) => get(batchFilePathsAtom)[0]);

export const concatOutputDirAtom = atom((get) => getOutDir(get(customOutDirAtom), get(concatFirstPathAtom)));

export const concatMergedFileTemplateAtom = atom((get) => (
    get(simpleModeAtom)
        ? (get(concatTempMergedFileTemplateAtom) ?? defaultMergedFileTemplate)
        : (get(userSettingsAtom).mergedFileTemplate ?? defaultMergedFileTemplate)
));

/** Defined only when the meta of all files has been read */
export const concatMatchingFilesMetaAtom = atom((get) => {
    const paths = get(batchFilePathsAtom);
    const allFilesMeta = get(concatFilesMetaAtom);
    if (paths.length === 0) return undefined;
    const filtered = paths.flatMap((path) => (allFilesMeta[path] ? [[path, allFilesMeta[path]] as const] : []));
    return filtered.length === paths.length ? filtered : undefined;
});

const checkedStreamParameters = ['codec_name', 'width', 'height', 'pix_fmt', 'level', 'profile', 'sample_fmt', 'avg_frame_rate', 'r_frame_rate', 'time_base'] as const;

export const concatProblemsByFileAtom = atom((get) => {
    const matchingFilesMeta = get(concatMatchingFilesMetaAtom);
    if (!matchingFilesMeta) return {};
    const [, firstFileMeta] = matchingFilesMeta[0]!;
    const problems: Record<string, Problem[]> = {};

    function addProblem(path: string, problem: Problem) {
        (problems[path] ??= []).push(problem);
    }

    matchingFilesMeta.slice(1).forEach(([path, { ffprobeMeta: { streams } }]) => {
        streams.forEach((stream, i) => {
            const referenceStream = firstFileMeta.ffprobeMeta.streams[i];
            if (!referenceStream) {
                addProblem(path, { type: 'extraneous', index: stream.index });
                return;
            }
            checkedStreamParameters.forEach((key) => {
                // special handling: https://github.com/mifi/lossless-cut/discussions/2740
                if (key === 'avg_frame_rate') {
                    const val = parseRatio(stream[key]);
                    const referenceVal = parseRatio(referenceStream[key]);
                    const sigma = 0.01;
                    if ((val == null && referenceVal != null) || (val != null && referenceVal == null) || (val != null && referenceVal != null && Math.abs(val - referenceVal) >= sigma)) {
                        addProblem(path, { type: 'parameter_mismatch', index: stream.index, key, values: [String(val), referenceVal] });
                    }
                } else {
                    const val = stream[key];
                    const referenceVal = referenceStream[key];
                    if (val !== referenceVal) {
                        addProblem(path, { type: 'parameter_mismatch', index: stream.index, key, values: [String(val), referenceVal] });
                    }
                }
            });
        });
    });
    return problems;
});

export const concatShowMismatchAlertAtom = atom((get) => get(concatEnableReadFileMetaAtom) && (!get(concatMatchingFilesMetaAtom) || Object.values(get(concatProblemsByFileAtom)).length > 0));

/** Upstream ConcatDialog generateFileNames. Takes a getter so that it can be used from effects (tracked) and actions */
export async function generateConcatFileNames(get: Getter, template: string) {
    const fileFormat = get(fileFormatAtom);
    const outputDir = get(concatOutputDirAtom);
    if (fileFormat == null || outputDir == null) return undefined;
    const allFilesMeta = get(concatFilesMetaAtom);
    const sourceFiles = get(batchFilePathsAtom).map((path) => ({ path, ...allFilesMeta[path] }));
    if (sourceFiles.length === 0) return undefined;

    return generateMergedFileNames({
        template,
        sourceFiles,
        fileFormat,
        outputDir,
        epochMs: get(concatUniqueSuffixAtom),
        isCustomFormatSelected: get(isCustomFormatSelectedAtom),
        safeOutputFileName: get(userSettingsAtom).safeOutputFileName,
        maxLabelLength: get(maxLabelLengthAtom),
        exportCount: get(exportCountAtom),
    });
}

// Batch file list

export const batchSortDescAtom = atom<boolean | undefined>(undefined);
export const batchDraggingIdAtom = atom<UniqueIdentifier | undefined>(undefined);
