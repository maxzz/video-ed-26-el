import { atom, type Getter } from 'jotai';
import invariant from 'tiny-invariant';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { maxLabelLengthAtom, userSettings, userSettingsAtom } from '@/editor/0-core/9-state/user-settings.ts';
import { formatTimecode, formatTimecodeAtom } from '@/editor/0-core/9-state/timecode.ts';
import { currentFileExportCountAtom, exportCountAtom, fileDurationAtom, fileFormatAtom, filePathAtom, isCustomFormatSelectedAtom, mainFileMetaAtom, outputDirAtom } from '@/editor/2-file/9-state/file-atoms.ts';
import { segmentsToExportAtom } from '@/editor/5-segments/9-state/segments-store.ts';
import { generateCutFileNames, generateCutMergedFileNames, generateMergedFileNames, type GenerateMergedOutFileNamesParams } from '../8-lib/output-name-template.ts';

// Upstream App.tsx generateCutFileNames/generateCutMergedFileNames/generateMergedFileNames bound to the current state

export async function generateOutSegFileNames(template: string) {
    const fileFormat = appStore.get(fileFormatAtom);
    const outputDir = appStore.get(outputDirAtom);
    const filePath = appStore.get(filePathAtom);
    invariant(fileFormat != null && outputDir != null && filePath != null);
    return generateCutFileNames({
        fileDuration: appStore.get(fileDurationAtom),
        exportCount: appStore.get(exportCountAtom),
        currentFileExportCount: appStore.get(currentFileExportCountAtom),
        segmentsToExport: appStore.get(segmentsToExportAtom),
        template,
        formatTimecode,
        isCustomFormatSelected: appStore.get(isCustomFormatSelectedAtom),
        fileFormat,
        sourceFile: { path: filePath, ...appStore.get(mainFileMetaAtom) },
        outputDir,
        safeOutputFileName: userSettings.safeOutputFileName,
        maxLabelLength: appStore.get(maxLabelLengthAtom),
        outputFileNameMinZeroPadding: userSettings.outputFileNameMinZeroPadding,
    });
}

export async function generateCutMergedOutFileNames(template: string) {
    const fileFormat = appStore.get(fileFormatAtom);
    const outputDir = appStore.get(outputDirAtom);
    const filePath = appStore.get(filePathAtom);
    invariant(fileFormat != null && outputDir != null && filePath != null);
    return generateCutMergedFileNames({
        template,
        isCustomFormatSelected: appStore.get(isCustomFormatSelectedAtom),
        fileFormat,
        sourceFile: { path: filePath, ...appStore.get(mainFileMetaAtom) },
        outputDir,
        safeOutputFileName: userSettings.safeOutputFileName,
        maxLabelLength: appStore.get(maxLabelLengthAtom),
        exportCount: appStore.get(exportCountAtom),
        currentFileExportCount: appStore.get(currentFileExportCountAtom),
        segLabels: appStore.get(segmentsToExportAtom).map((seg) => seg.name ?? ''),
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
        isCustomFormatSelected: appStore.get(isCustomFormatSelectedAtom),
        safeOutputFileName: userSettings.safeOutputFileName,
        maxLabelLength: appStore.get(maxLabelLengthAtom),
        exportCount: appStore.get(exportCountAtom),
    });
}
