import { atom, type Getter } from 'jotai';
import invariant from 'tiny-invariant';
import { jotaiDefaultStore } from '@/utils/local-utils/9-jotai-default-store.ts';
import { maxLabelLengthAtom, userSettings, userSettingsAtom } from '@/editor/0-core/9-state/user-settings.ts';
import { formatTimecode, formatTimecodeAtom } from '@/editor/0-core/9-state/timecode.ts';
import { currentFileExportCountAtom, exportCountAtom, fileDurationAtom, fileFormatAtom, filePathAtom, isCustomFormatSelectedAtom, mainFileMetaAtom, outputDirAtom } from '@/editor/2-file/9-state/a-file-atoms.ts';
import { segmentsToExportAtom } from '@/editor/5-segments/9-state/segments-store.ts';
import { generateCutFileNames, generateCutMergedFileNames, generateMergedFileNames, type GenerateMergedOutFileNamesParams } from '../8-lib/output-name-template.ts';

// Upstream App.tsx generateCutFileNames/generateCutMergedFileNames/generateMergedFileNames bound to the current state

export async function generateOutSegFileNames(template: string) {
    const fileFormat = jotaiDefaultStore.get(fileFormatAtom);
    const outputDir = jotaiDefaultStore.get(outputDirAtom);
    const filePath = jotaiDefaultStore.get(filePathAtom);
    invariant(fileFormat != null && outputDir != null && filePath != null);
    return generateCutFileNames({
        fileDuration: jotaiDefaultStore.get(fileDurationAtom),
        exportCount: jotaiDefaultStore.get(exportCountAtom),
        currentFileExportCount: jotaiDefaultStore.get(currentFileExportCountAtom),
        segmentsToExport: jotaiDefaultStore.get(segmentsToExportAtom),
        template,
        formatTimecode,
        isCustomFormatSelected: jotaiDefaultStore.get(isCustomFormatSelectedAtom),
        fileFormat,
        sourceFile: { path: filePath, ...jotaiDefaultStore.get(mainFileMetaAtom) },
        outputDir,
        safeOutputFileName: userSettings.safeOutputFileName,
        maxLabelLength: jotaiDefaultStore.get(maxLabelLengthAtom),
        outputFileNameMinZeroPadding: userSettings.outputFileNameMinZeroPadding,
    });
}

export async function generateCutMergedOutFileNames(template: string) {
    const fileFormat = jotaiDefaultStore.get(fileFormatAtom);
    const outputDir = jotaiDefaultStore.get(outputDirAtom);
    const filePath = jotaiDefaultStore.get(filePathAtom);
    invariant(fileFormat != null && outputDir != null && filePath != null);
    return generateCutMergedFileNames({
        template,
        isCustomFormatSelected: jotaiDefaultStore.get(isCustomFormatSelectedAtom),
        fileFormat,
        sourceFile: { path: filePath, ...jotaiDefaultStore.get(mainFileMetaAtom) },
        outputDir,
        safeOutputFileName: userSettings.safeOutputFileName,
        maxLabelLength: jotaiDefaultStore.get(maxLabelLengthAtom),
        exportCount: jotaiDefaultStore.get(exportCountAtom),
        currentFileExportCount: jotaiDefaultStore.get(currentFileExportCountAtom),
        segLabels: jotaiDefaultStore.get(segmentsToExportAtom).map((seg) => seg.name ?? ''),
    });
}

function readOutFileNameDeps(get: Getter) {
    get(fileFormatAtom);
    get(outputDirAtom);
    get(filePathAtom);
    get(fileDurationAtom);
    get(exportCountAtom);
    get(currentFileExportCountAtom);
    get(segmentsToExportAtom);
    get(isCustomFormatSelectedAtom);
    get(mainFileMetaAtom);
    get(maxLabelLengthAtom);
    get(formatTimecodeAtom);
    get(userSettingsAtom);
}

/** A new generator function whenever any input of the file names changes, so the template editor regenerates its preview */
export const generateOutSegFileNamesFnAtom = atom((get) => {
    readOutFileNameDeps(get);
    return (template: string) => generateOutSegFileNames(template);
});

export const generateCutMergedOutFileNamesFnAtom = atom((get) => {
    readOutFileNameDeps(get);
    return (template: string) => generateCutMergedOutFileNames(template);
});

export async function generateMergedOutFileNames(params: GenerateMergedOutFileNamesParams) {
    return generateMergedFileNames({
        ...params,
        isCustomFormatSelected: jotaiDefaultStore.get(isCustomFormatSelectedAtom),
        safeOutputFileName: userSettings.safeOutputFileName,
        maxLabelLength: jotaiDefaultStore.get(maxLabelLengthAtom),
        exportCount: jotaiDefaultStore.get(exportCountAtom),
    });
}
