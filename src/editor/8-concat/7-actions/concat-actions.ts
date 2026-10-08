import i18n from "i18next";
import invariant from "tiny-invariant";
import sum from "lodash/sum.js";
import { type FFprobeStream } from "@shared/ffprobe";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { customOutDirAtom, userSettings } from "@/editor/0-core/9-state/user-settings";
import { isWorking, setProgress, setWorking } from "@/editor/0-core/9-state/working";
import { showDialog_ConcatFailed } from "@/components/4-dialogs/7-1-dialogs/12-show-concat-failed-dialog";
import { show_ErrorToast } from "@/components/4-dialogs/7-1-dialogs/00-app-dialogs";
import { showDialog_DiskFull, showDialog_MuxNotSupported, showDialog_OutputNotWritable } from "@/components/4-dialogs/7-1-dialogs/24-dlg-error-toasts";
import { DirectoryAccessDeclinedError, UserFacingError } from "@/editor/0-core/8-lib/9-error-types";
import { createChaptersFromSegments } from "@/editor/0-core/8-lib/ffmpeg/ffmpeg";
import { parsePath } from "@/editor/0-core/8-lib/node-shims";
import {
    checkFileSizes, getOutDir, getOutPath, getStdioString, isAbortedError, isExecaError, isMuxNotSupported, isOutOfSpaceError,
    makeSourceFileAccessError, readFileSize, readFileSizes,
} from "@/editor/0-core/8-lib/util";
import { batchFilePathsAtom, batchFilesAtom, detectedFileFormatAtom, fileFormatAtom } from "@/editor/2-file/9-state/a-file-atoms";
import { closeBatch, ensureWritableOutDir, openFilesDialog, openSendReportDialog } from "@/editor/2-file";
import { concatDialogOpenAtom } from "@/components/2-main/0-all/a-panels-atoms";
import { concatFiles, maybeMkDeepOutDir, OutputNotWritableError } from "@/editor/7-export/8-lib/ffmpeg-operations";
import { type GeneratedOutFileNames } from "@/editor/7-export/8-lib/output-name-template";
import { showOsNotification } from "@/editor/0-core/8-lib/notifications";
import { openDialog_ConcatFinished } from "@/components/4-dialogs/7-2-dialogs/1-dlgs-finished";
import {
    concatClearBatchFilesAfterConcatAtom, concatEnableReadFileMetaAtom, concatFilesMetaAtom, concatFirstPathAtom, concatIncludeAllStreamsAtom,
    concatMergedFileTemplateAtom, concatOutputDirAtom, concatTempMergedFileTemplateAtom, generateConcatFileNames,
} from "../9-state/concat-atoms";

// Port of upstream App.tsx userConcatFiles/concatBatch and the actions of components/ConcatDialog.tsx

/** Opens the merge dialog, or the open files dialog if there is nothing to merge yet */
export function concatBatch() {
    if (jotaiDefaultStore.get(batchFilesAtom).length < 2) {
        openFilesDialog();
        return;
    }
    jotaiDefaultStore.set(concatDialogOpenAtom, true);
}

export function closeConcatDialog() {
    jotaiDefaultStore.set(concatDialogOpenAtom, false);
}

export function setConcatEnableReadFileMeta(checked: boolean) {
    jotaiDefaultStore.set(concatEnableReadFileMetaAtom, checked);
    jotaiDefaultStore.set(concatFilesMetaAtom, {});
}

export function setConcatMergedFileTemplate(template: string) {
    if (userSettings.simpleMode) jotaiDefaultStore.set(concatTempMergedFileTemplateAtom, template);
    else userSettings.mergedFileTemplate = template;
}

function getSettingsForReport() {
    const { keyBindings: _keyBindings, ...settings } = userSettings;
    return settings;
}

async function handleConcatFailed(err: unknown, reportState: object) {
    const sendErrorReport = await showDialog_ConcatFailed({ fileFormat: jotaiDefaultStore.get(fileFormatAtom) });
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

    const customOutDir = jotaiDefaultStore.get(customOutDirAtom);

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
            openDialog_ConcatFinished({ filePath: outPath, notices: [...notices], warnings: [...warnings] });
        }
    } catch (err) {
        if (err instanceof DirectoryAccessDeclinedError || isAbortedError(err)) return;

        showOsNotification(i18n.t('Failed to merge'));

        if (isExecaError(err)) {
            console.log('stdout:', getStdioString((err as { stdout?: string | Uint8Array; }).stdout ?? ''));
            console.error('stderr:', getStdioString(err.stderr));

            if (isOutOfSpaceError(err)) {
                showDialog_DiskFull();
                return;
            }
            if (isMuxNotSupported(err)) {
                showDialog_MuxNotSupported();
                return;
            }
        }

        if (err instanceof OutputNotWritableError) {
            showDialog_OutputNotWritable();
            return;
        }

        if (err instanceof UserFacingError) {
            show_ErrorToast(err.message);
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
    const firstPath = jotaiDefaultStore.get(concatFirstPathAtom);
    const fileFormat = jotaiDefaultStore.get(fileFormatAtom);
    invariant(firstPath != null);
    invariant(fileFormat != null);
    invariant(jotaiDefaultStore.get(concatOutputDirAtom) != null);
    const firstFileMeta = jotaiDefaultStore.get(concatFilesMetaAtom)[firstPath];
    invariant(firstFileMeta != null);

    const generatedFileNames = await generateConcatFileNames(jotaiDefaultStore.get, jotaiDefaultStore.get(concatMergedFileTemplateAtom));
    invariant(generatedFileNames != null);

    await userConcatFiles({
        paths: jotaiDefaultStore.get(batchFilePathsAtom),
        includeAllStreams: jotaiDefaultStore.get(concatIncludeAllStreamsAtom),
        streams: firstFileMeta.ffprobeMeta.streams,
        fileFormat,
        clearBatchFilesAfterConcat: jotaiDefaultStore.get(concatClearBatchFilesAfterConcatAtom),
        generatedFileNames,
    });
}
