import i18n from 'i18next';
import invariant from 'tiny-invariant';
import sum from 'lodash/sum.js';
import type { FFprobeStream } from '@shared/ffprobe';
import { appStore } from '@/editor/0-core/0-state/store.ts';
import { customOutDirAtom, userSettings } from '@/editor/0-core/0-state/user-settings.ts';
import { isWorking, setProgress, setWorking } from '@/editor/0-core/0-state/working.ts';
import { errorToast, showConcatFailedDialog, showDiskFull, showMuxNotSupported, showOutputNotWritable } from '@/editor/0-core/2-lib/app-dialogs.tsx';
import { DirectoryAccessDeclinedError, UserFacingError } from '@/editor/0-core/2-lib/errors.ts';
import { createChaptersFromSegments } from '@/editor/0-core/2-lib/ffmpeg/ffmpeg.ts';
import { parsePath } from '@/editor/0-core/2-lib/node-shims.ts';
import {
    checkFileSizes, getOutDir, getOutPath, getStdioString, isAbortedError, isExecaError, isMuxNotSupported, isOutOfSpaceError,
    makeSourceFileAccessError, readFileSize, readFileSizes,
} from '@/editor/0-core/2-lib/util.ts';
import { batchFilePathsAtom, batchFilesAtom, detectedFileFormatAtom, fileFormatAtom } from '@/editor/2-file/0-state/file-atoms.ts';
import { closeBatch, ensureWritableOutDir, openFilesDialog, openSendReportDialog } from '@/editor/2-file/index.ts';
import { concatDialogOpenAtom } from '@/editor/1-layout/0-state/panels-atoms.ts';
import { concatFiles, maybeMkDeepOutDir, OutputNotWritableError } from '@/editor/7-export/2-lib/ffmpeg-operations.ts';
import type { GeneratedOutFileNames } from '@/editor/7-export/2-lib/output-name-template.ts';
import { showOsNotification } from '@/editor/0-core/2-lib/notifications.ts';
import { openConcatFinishedDialog } from '@/editor/7-export/3-ui/finished-dialogs.tsx';
import {
    concatClearBatchFilesAfterConcatAtom, concatEnableReadFileMetaAtom, concatFilesMetaAtom, concatFirstPathAtom, concatIncludeAllStreamsAtom,
    concatMergedFileTemplateAtom, concatOutputDirAtom, concatTempMergedFileTemplateAtom, generateConcatFileNames,
} from '../0-state/concat-atoms.ts';

// Port of upstream App.tsx userConcatFiles/concatBatch and the actions of components/ConcatDialog.tsx

/** Opens the merge dialog, or the open files dialog if there is nothing to merge yet */
export function concatBatch() {
    if (appStore.get(batchFilesAtom).length < 2) {
        openFilesDialog();
        return;
    }
    appStore.set(concatDialogOpenAtom, true);
}

export function closeConcatDialog() {
    appStore.set(concatDialogOpenAtom, false);
}

export function setConcatEnableReadFileMeta(checked: boolean) {
    appStore.set(concatEnableReadFileMetaAtom, checked);
    appStore.set(concatFilesMetaAtom, {});
}

export function setConcatMergedFileTemplate(template: string) {
    if (userSettings.simpleMode) appStore.set(concatTempMergedFileTemplateAtom, template);
    else userSettings.mergedFileTemplate = template;
}

function getSettingsForReport() {
    const { keyBindings: _keyBindings, ...settings } = userSettings;
    return settings;
}

async function handleConcatFailed(err: unknown, reportState: object) {
    const sendErrorReport = await showConcatFailedDialog({ fileFormat: appStore.get(fileFormatAtom) });
    if (sendErrorReport) openSendReportDialog({ err, state: { ...getSettingsForReport(), ...reportState } });
}

export async function userConcatFiles({ paths, includeAllStreams, streams, fileFormat: outFormat, clearBatchFilesAfterConcat, generatedFileNames }: {
    paths: string[];
    includeAllStreams: boolean;
    streams: FFprobeStream[];
    fileFormat: string;
    clearBatchFilesAfterConcat: boolean;
    generatedFileNames: GeneratedOutFileNames;
}) {
    if (isWorking()) return;

    const firstPath = paths[0];
    if (!firstPath) return;

    const customOutDir = appStore.get(customOutDirAtom);

    try {
        // need to ensure the output dir is writable, because the user might not yet have opened a file, and so MAS might not yet have access to write the dir
        const newCustomOutDir = await ensureWritableOutDir({ inputPath: firstPath, outDir: customOutDir });
        if (newCustomOutDir !== customOutDir) {
            // throw user back to the concat dialog because now things might have changed (which could affect overwriting files etc!)
            // also if the user cancels the dialog, `DirectoryAccessDeclinedError` will be thrown and we will return (see catch below)
            return;
        }

        // only after ensuring out dir access, we can close the concat dialog
        closeConcatDialog();
        setWorking({ text: i18n.t('Merging') });

        const warnings = new Set<string>();
        const notices = new Set<string>();

        const { fileNames, problems } = generatedFileNames;
        if (problems.error != null) {
            console.warn('Merged file name invalid, using default instead', fileNames[0]);
            warnings.add(problems.error);
            warnings.add(i18n.t('Fell back to default output file name'));
        }

        const outDir = getOutDir(customOutDir, firstPath);

        const [fileName] = fileNames;
        invariant(fileName != null);
        const outPath = getOutPath({ customOutDir, filePath: firstPath, fileName });

        const chaptersFromSegments = userSettings.segmentsToChapters
            ? await createChaptersFromSegments({ paths, defaultChapterNames: paths.map((path) => parsePath(path).name), useFileChapters: true })
            : undefined;

        let inputSize: number;
        try {
            inputSize = sum(await readFileSizes(paths));
        } catch (err) {
            console.warn('Unable to read input file sizes', err);
            throw makeSourceFileAccessError();
        }

        await maybeMkDeepOutDir({ outputDir: outDir, fileOutPath: outPath });

        const { haveExcludedStreams } = await concatFiles({
            paths,
            outPath,
            outDir,
            outFormat,
            metadataFromPath: firstPath,
            includeAllStreams,
            streams,
            ffmpegExperimental: userSettings.ffmpegExperimental,
            onProgress: setProgress,
            preserveMovData: userSettings.preserveMovData,
            movFastStart: userSettings.movFastStart,
            preserveMetadataOnMerge: userSettings.preserveMetadataOnMerge,
            chapters: chaptersFromSegments,
        });

        const outputSize = await readFileSize(outPath);
        const sizeCheckResult = checkFileSizes(inputSize, outputSize);
        if (sizeCheckResult != null) warnings.add(sizeCheckResult);

        if (clearBatchFilesAfterConcat) closeBatch();
        if (!includeAllStreams && haveExcludedStreams) notices.add(i18n.t('Some extra tracks have been discarded. You can change this option before merging.'));
        if (!userSettings.enableOverwriteOutput) warnings.add(i18n.t('Overwrite output setting is disabled and some files might have been skipped.'));

        if (userSettings.hideNotifications !== 'all') {
            showOsNotification(i18n.t('Merge finished'));
            openConcatFinishedDialog({ filePath: outPath, notices: [...notices], warnings: [...warnings] });
        }
    } catch (err) {
        if (err instanceof DirectoryAccessDeclinedError || isAbortedError(err)) return;

        showOsNotification(i18n.t('Failed to merge'));

        if (isExecaError(err)) {
            console.log('stdout:', getStdioString((err as { stdout?: string | Uint8Array; }).stdout ?? ''));
            console.error('stderr:', getStdioString(err.stderr));

            if (isOutOfSpaceError(err)) {
                showDiskFull();
                return;
            }
            if (isMuxNotSupported(err)) {
                showMuxNotSupported();
                return;
            }
        }

        if (err instanceof OutputNotWritableError) {
            showOutputNotWritable();
            return;
        }

        if (err instanceof UserFacingError) {
            errorToast(err.message);
            return;
        }

        handleConcatFailed(err, { includeAllStreams, streams, outFormat, clearBatchFilesAfterConcat });
    } finally {
        setWorking(undefined);
        setProgress(undefined);
    }
}

/** Merge button of the dialog (upstream ConcatDialog onConcatClick) */
export async function onConcatClick() {
    const firstPath = appStore.get(concatFirstPathAtom);
    const fileFormat = appStore.get(fileFormatAtom);
    invariant(firstPath != null);
    invariant(fileFormat != null);
    invariant(appStore.get(concatOutputDirAtom) != null);
    const firstFileMeta = appStore.get(concatFilesMetaAtom)[firstPath];
    invariant(firstFileMeta != null);

    const generatedFileNames = await generateConcatFileNames(appStore.get, appStore.get(concatMergedFileTemplateAtom));
    invariant(generatedFileNames != null);

    await userConcatFiles({
        paths: appStore.get(batchFilePathsAtom),
        includeAllStreams: appStore.get(concatIncludeAllStreamsAtom),
        streams: firstFileMeta.ffprobeMeta.streams,
        fileFormat,
        clearBatchFilesAfterConcat: appStore.get(concatClearBatchFilesAfterConcatAtom),
        generatedFileNames,
    });
}
