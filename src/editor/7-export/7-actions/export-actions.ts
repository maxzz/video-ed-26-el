import i18n from 'i18next';
import invariant from 'tiny-invariant';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { customOutDirAtom, effectiveExportModeAtom, hideAllNotificationsAtom, prefersReducedMotionAtom, setCustomOutDir, userSettings } from '@/editor/0-core/9-state/user-settings.ts';
import { isWorking, setProgress, setWorking, withErrorHandling } from '@/editor/0-core/9-state/working.ts';
import { askForOutDir, type CleanupChoicesType, confirmDialog, deleteFiles, errorToast, showDiskFull, showExportFailedDialog, showMuxNotSupported, showOutputNotWritable, showRefuseToOverwrite } from '@/editor/0-core/8-lib/app-dialogs.tsx';
import { UserFacingError } from '@/editor/0-core/8-lib/errors.ts';
import { isIphoneHevc, isProblematicAvc1, RefuseOverwriteError } from '@/editor/0-core/8-lib/ffmpeg/ffmpeg.ts';
import { isMatroska } from '@/editor/0-core/8-lib/ffmpeg/streams.ts';
import { mainApi } from '@/editor/0-core/8-lib/main-api.ts';
import type { Chapter, ExportMode } from '@/editor/0-core/8-lib/types.ts';
import { DirectoryAccessDeclinedError } from '@/editor/0-core/8-lib/errors.ts';
import { ensureWritableOutDir } from '@/editor/2-file/7-actions/directory-access.ts';
import { getOutFileExtension, getOutPath, getStdioString, getSuffixedOutPath, isAbortedError, isExecaError, isMuxNotSupported, isOutOfSpaceError, transferTimestamps } from '@/editor/0-core/8-lib/util.ts';
import { exportConfirmOpenAtom, streamsSelectorShownAtom } from '@/editor/1-layout/9-state/panels-atoms.ts';
import {
    allFilesMetaAtom, currentFileExportCountAtom, detectedFileFormatAtom, detectedFpsAtom, exportCountAtom, externalFilesMetaAtom, fileDurationAtom, fileFormatAtom, filePathAtom,
    isFileOpenedAtom, isRotationSetAtom, mainFileFormatDataAtom, mainStreamsAtom, outputDirAtom, paramsByFileAtom, previewFilePathAtom, rotationAtom, shortestFlagAtom,
} from '@/editor/2-file/9-state/file-atoms.ts';
import { batchListRemoveFile } from '@/editor/2-file/7-actions/batch-actions.ts';
import { closeFile, loadMedia, runAndReloadFile, tryFixInvalidDuration } from '@/editor/2-file/7-actions/load-media.ts';
import { projectFileSavePathAtom } from '@/editor/2-file/7-actions/project-auto-save.ts';
import { openSendReportDialog } from '@/editor/2-file/0-ui/send-report-dialog.tsx';
import { effectiveRotationAtom } from '@/editor/3-player/9-state/player-atoms.ts';
import { checkFileOpened } from '@/editor/3-player/7-actions/player-actions.ts';
import { cutSegmentsAtom, haveInvalidSegsAtom, segmentsOrInverseAtom, segmentsToExportAtom, selectedSegmentsAtom } from '@/editor/5-segments/9-state/segments-store.ts';
import { convertSegmentsToChaptersWithGaps, hasAnySegmentOverlap, sortSegments } from '@/editor/5-segments/8-lib/segments.ts';
import { copyFileStreamsAtom, copyStreamIdsByFileAtom, exportExtraStreamsAtom, mainCopiedStreamsAtom, nonCopiedExtraStreamsAtom, numStreamsToCopyAtom } from '@/editor/6-streams/9-state/streams-store.ts';
import { formatTsvHuman } from '@/editor/9-edl/8-lib/edl-formats.ts';
import { areWeCuttingAtom, cutFileTemplateOrDefaultAtom, cutMergedFileTemplateOrDefaultAtom, willMergeAtom } from '../9-state/export-atoms.ts';
import { concatCutSegments, cutMultiple, decimate, extractStreams, fixInvalidDuration, OutputNotWritableError, tryDeleteFiles } from '../8-lib/ffmpeg-operations.ts';
import { defaultCutFileTemplate } from '../8-lib/output-name-template.ts';
import { showNotification, showOsNotification } from '@/editor/0-core/8-lib/notifications.ts';
import { openCleanupFilesDialog, openCutFinishedDialog, openDecimateDialog, openExportFinishedDialog } from '../0-ui/finished-dialogs.tsx';
import { generateCutMergedOutFileNames, generateOutSegFileNames } from './out-file-names.ts';

// Port of the export flow of upstream App.tsx

const emitEvent = (event: Parameters<typeof mainApi.emitAppEvent>[0]) => { mainApi.emitAppEvent(event).catch(console.error); };

function getReportState() {
    const { keyBindings: _keyBindings, ...settings } = userSettings;
    return {
        ...settings,
        filePath: appStore.get(filePathAtom),
        fileFormat: appStore.get(fileFormatAtom),
        externalFilesMeta: appStore.get(externalFilesMetaAtom),
        mainStreams: appStore.get(mainStreamsAtom),
        copyStreamIdsByFile: appStore.get(copyStreamIdsByFileAtom),
        cutSegments: appStore.get(cutSegmentsAtom).map((s) => ({ start: s.start, end: s.end })),
        mainFileFormat: appStore.get(mainFileFormatDataAtom),
        rotation: appStore.get(rotationAtom),
        shortestFlag: appStore.get(shortestFlagAtom),
        effectiveExportMode: appStore.get(effectiveExportModeAtom),
    };
}

export async function handleExportFailed(err: unknown) {
    const sendErrorReport = await showExportFailedDialog({ fileFormat: appStore.get(fileFormatAtom), safeOutputFileName: userSettings.safeOutputFileName });
    if (sendErrorReport) openSendReportDialog({ err, state: getReportState() });
}

/** Shows the dialog matching a failed ffmpeg operation. Returns false if the error was not handled */
export function handleFfmpegFailure(err: unknown) {
    if (isExecaError(err)) {
        console.error('stderr:', getStdioString(err.stderr));

        if (isOutOfSpaceError(err)) {
            showDiskFull();
            return true;
        }
        if (isMuxNotSupported(err)) {
            showMuxNotSupported();
            return true;
        }
    }

    if (err instanceof OutputNotWritableError) {
        showOutputNotWritable();
        return true;
    }

    if (err instanceof UserFacingError) {
        errorToast(err.message);
        return true;
    }
    return false;
}

// Cleanup

export async function cleanupFiles(cleanupChoices2: CleanupChoicesType) {
    // Store paths before we reset state
    const savedPaths = {
        previewFilePath: appStore.get(previewFilePathAtom),
        sourceFilePath: appStore.get(filePathAtom),
        projectFilePath: appStore.get(projectFileSavePathAtom),
    };

    if (cleanupChoices2.closeFile) {
        batchListRemoveFile(savedPaths.sourceFilePath);
        closeFile();
    }

    await withErrorHandling(async () => {
        const abortController = new AbortController();
        setWorking({ text: i18n.t('Cleaning up'), abortController });
        console.log('Cleaning up files', cleanupChoices2);

        const pathsToDelete: string[] = [];
        if (cleanupChoices2.trashTmpFiles && savedPaths.previewFilePath) pathsToDelete.push(savedPaths.previewFilePath);
        if (cleanupChoices2.trashProjectFile && savedPaths.projectFilePath) pathsToDelete.push(savedPaths.projectFilePath);
        if (cleanupChoices2.trashSourceFile && savedPaths.sourceFilePath) pathsToDelete.push(savedPaths.sourceFilePath);

        await deleteFiles({ paths: pathsToDelete, deleteIfTrashFails: cleanupChoices2.deleteIfTrashFails, signal: abortController.signal });
    }, i18n.t('Unable to delete file'));
}

export async function askForCleanupChoices() {
    const trashResponse = await openCleanupFilesDialog(userSettings.cleanupChoices);
    if (trashResponse != null) userSettings.cleanupChoices = trashResponse; // Store for next time, if not canceled
    return trashResponse;
}

export async function cleanupFilesDialog() {
    if (!appStore.get(isFileOpenedAtom) || isWorking()) return;

    try {
        const { cleanupChoices } = userSettings;
        const newCleanupChoices = cleanupChoices.askForCleanup ? await askForCleanupChoices() : cleanupChoices;
        // only if not canceled
        if (newCleanupChoices != null) await cleanupFiles(newCleanupChoices);
    } finally {
        setWorking(undefined);
    }
}

// Export

export async function onExportConfirm() {
    const filePath = appStore.get(filePathAtom);
    const outputDir = appStore.get(outputDirAtom);
    invariant(filePath != null && outputDir != null);
    emitEvent({ eventName: 'export-start', path: filePath });

    if (appStore.get(numStreamsToCopyAtom) === 0) {
        errorToast(i18n.t('No tracks selected for export'));
        return;
    }

    if (appStore.get(haveInvalidSegsAtom)) {
        errorToast(i18n.t('Start time must be before end time'));
        return;
    }

    appStore.set(streamsSelectorShownAtom, false);
    appStore.set(exportConfirmOpenAtom, false);

    if (isWorking()) return;

    const {
        segmentsToChaptersOnly, autoDeleteMergedSegments, keyframeCut, ffmpegExperimental, preserveMetadata, preserveMetadataOnMerge, preserveMovData, preserveChapters,
        movFastStart, avoidNegativeTs, enableOverwriteOutput, exportConfirmEnabled, segmentsToChapters, invertCutSegments, simpleMode, cleanupChoices,
    } = userSettings;
    const customOutDir = appStore.get(customOutDirAtom);
    const fileFormat = appStore.get(fileFormatAtom);
    const segmentsToExport = appStore.get(segmentsToExportAtom);
    const willMerge = appStore.get(willMergeAtom);
    const mainStreams = appStore.get(mainStreamsAtom);

    try {
        setWorking({ text: i18n.t('Exporting') });

        // Special segments-to-chapters mode:
        let chaptersToAdd: Chapter[] | undefined;
        if (segmentsToChaptersOnly) {
            const sortedSegments = sortSegments(appStore.get(segmentsOrInverseAtom).selected);
            if (hasAnySegmentOverlap(sortedSegments)) {
                errorToast(i18n.t('Make sure you have no overlapping segments.'));
                return;
            }
            // matroska supports gaps, so we can use segments directly
            chaptersToAdd = isMatroska(fileFormat) ? sortedSegments : convertSegmentsToChaptersWithGaps(sortedSegments);
        }

        const cutFileTemplateOrDefault = appStore.get(cutFileTemplateOrDefaultAtom);
        console.log('cutFileTemplate', cutFileTemplateOrDefault);

        const notices = new Set<string>();
        const warnings = new Set<string>();

        let cutFileNames: string[];
        // When deleting merged segments, use the default template so that we e.g. don't risk creating a folder structure
        // https://github.com/mifi/lossless-cut/issues/2637
        if (willMerge && autoDeleteMergedSegments) {
            const generated = await generateOutSegFileNames(defaultCutFileTemplate);
            cutFileNames = generated.fileNames;
        } else {
            const generated = await generateOutSegFileNames(cutFileTemplateOrDefault);
            cutFileNames = generated.fileNames;
            if (generated.problems.error != null) {
                console.warn('Output segments file name invalid, using default instead', generated.fileNames);
                warnings.add(generated.problems.error);
                warnings.add(i18n.t('Fell back to default output file name'));
            }
        }

        const outFiles = await cutMultiple({
            outputDir,
            customOutDir,
            outFormat: fileFormat,
            fileDuration: appStore.get(fileDurationAtom),
            rotation: appStore.get(isRotationSetAtom) ? appStore.get(effectiveRotationAtom) : undefined,
            copyFileStreams: appStore.get(copyFileStreamsAtom),
            allFilesMeta: appStore.get(allFilesMetaAtom),
            keyframeCut,
            segments: segmentsToExport,
            cutFileNames,
            onProgress: setProgress,
            shortestFlag: appStore.get(shortestFlagAtom),
            ffmpegExperimental,
            preserveMetadata,
            preserveMetadataOnMerge,
            preserveMovData,
            preserveChapters,
            movFastStart,
            avoidNegativeTs,
            paramsByFile: appStore.get(paramsByFileAtom),
            chapters: chaptersToAdd,
            detectedFps: appStore.get(detectedFpsAtom),
        });

        let mergedOutFilePath: string | undefined;

        if (willMerge) {
            const cutMergedFileTemplateOrDefault = appStore.get(cutMergedFileTemplateOrDefaultAtom);
            console.log('cutMergedFileTemplateOrDefault', cutMergedFileTemplateOrDefault);

            setProgress(0);
            setWorking({ text: i18n.t('Merging') });

            const chapterNames = segmentsToChapters && !invertCutSegments ? segmentsToExport.map((s) => s.name) : undefined;

            const { fileNames, problems } = await generateCutMergedOutFileNames(cutMergedFileTemplateOrDefault);
            if (problems.error != null) {
                console.warn('Merged file name invalid, using default instead', fileNames[0]);
                warnings.add(problems.error);
                warnings.add(i18n.t('Fell back to default output file name'));
            }

            const [fileName] = fileNames;
            invariant(fileName != null);
            mergedOutFilePath = getOutPath({ customOutDir, filePath, fileName });

            await concatCutSegments({
                customOutDir,
                outFormat: fileFormat,
                segmentPaths: outFiles.map((f) => f.path),
                ffmpegExperimental,
                preserveMovData,
                movFastStart,
                onProgress: setProgress,
                chapterNames,
                preserveMetadataOnMerge,
                mergedOutFilePath,
            });

            // don't delete existing files that were not created by losslesscut now (due to overwrite disabled) https://github.com/mifi/lossless-cut/issues/2436
            const createdOutFiles = outFiles.flatMap((f) => (f.created ? [f.path] : []));
            if (autoDeleteMergedSegments) await tryDeleteFiles(createdOutFiles);
        }

        if (!enableOverwriteOutput) warnings.add(i18n.t('Overwrite output setting is disabled and some files might have been skipped.'));

        if (!exportConfirmEnabled) notices.add(i18n.t('Export options are not shown. You can enable export options by clicking the icon right next to the export button.'));

        const mainFileFormat = appStore.get(mainFileFormatDataAtom);
        invariant(mainFileFormat != null);
        // https://github.com/mifi/lossless-cut/issues/329
        if (isIphoneHevc(mainFileFormat, mainStreams)) warnings.add(i18n.t('There is a known issue with cutting iPhone HEVC videos. The output file may not work in all players.'));

        // https://github.com/mifi/lossless-cut/issues/280
        if (!ffmpegExperimental && isProblematicAvc1(fileFormat, mainStreams)) warnings.add(i18n.t('There is a known problem with this file type, and the output might not be playable. You can work around this problem by enabling the "Experimental flag" under Settings.'));

        if (appStore.get(exportExtraStreamsAtom)) {
            const nonCopiedExtraStreams = appStore.get(nonCopiedExtraStreamsAtom);
            try {
                setProgress(undefined); // If extracting extra streams takes a long time, prevent loader from being stuck at 100%
                setWorking({ text: i18n.t('Extracting {{count}} unprocessable tracks', { count: nonCopiedExtraStreams.length }) });
                await extractStreams({ customOutDir, streams: nonCopiedExtraStreams });
                notices.add(i18n.t('Unprocessable streams were exported as separate files.'));
            } catch (err) {
                console.error('Extra stream export failed', err);
                warnings.add(i18n.t('Unable to export unprocessable streams.'));
            }
        }

        if (appStore.get(areWeCuttingAtom)) notices.add(i18n.t('Cutpoints may be inaccurate.'));

        if (simpleMode && !appStore.get(prefersReducedMotionAtom)) showNotification({ icon: 'success', text: i18n.t('Export is done!') });

        if (cleanupChoices.cleanupAfterExport) {
            const newCleanupChoices = cleanupChoices.askForCleanup ? await askForCleanupChoices() : cleanupChoices;
            // only if not canceled
            if (newCleanupChoices) await cleanupFiles(newCleanupChoices);
        }

        // Note: this should be after cleanup, so we don't accidentally open two dialogs at the same time https://github.com/mifi/lossless-cut/issues/2609
        const exportedPaths = willMerge && mergedOutFilePath != null ? [mergedOutFilePath] : outFiles.map((f) => f.path);
        const [revealPath] = exportedPaths;
        invariant(revealPath != null);
        if (!appStore.get(hideAllNotificationsAtom)) {
            showOsNotification(i18n.t('Export finished'));
            openCutFinishedDialog({ filePath: revealPath, warnings: [...warnings], notices: [...notices] });
        }

        increaseExportCount();

        emitEvent({ eventName: 'export-complete', paths: exportedPaths });
    } catch (err) {
        emitEvent({ eventName: 'export-complete' });

        if (isAbortedError(err)) return;

        showOsNotification(i18n.t('Failed to export'));

        if (handleFfmpegFailure(err)) return;

        handleExportFailed(err);
    } finally {
        setWorking(undefined);
        setProgress(undefined);
    }
}

export function increaseExportCount() {
    appStore.set(exportCountAtom, (c) => c + 1);
    appStore.set(currentFileExportCountAtom, (c) => c + 1);
}

export async function onExportPress() {
    if (!appStore.get(filePathAtom)) return;

    if (!userSettings.exportConfirmEnabled || appStore.get(exportConfirmOpenAtom)) {
        await onExportConfirm();
    } else {
        appStore.set(exportConfirmOpenAtom, true);
        appStore.set(streamsSelectorShownAtom, false);
    }
}

// Settings toggles used by the export UI

export function toggleKeyframeCut(showMessage?: boolean) {
    const newVal = !userSettings.keyframeCut;
    userSettings.keyframeCut = newVal;
    if (showMessage) {
        if (newVal) showNotification({ title: i18n.t('Keyframe cut enabled'), text: i18n.t('Will now cut at the nearest keyframe before the desired start cutpoint. This is recommended for most files.') });
        else showNotification({ title: i18n.t('Keyframe cut disabled'), text: i18n.t('Will now cut at the exact position, but may leave an empty portion at the beginning of the file. You may have to set the cutpoint a few frames before the next keyframe to achieve a precise cut'), timer: 7000 });
    }
}

export function toggleSafeOutputFileName() {
    const v = userSettings.safeOutputFileName;
    if (v) showNotification({ icon: 'info', text: i18n.t('Output file name will not be sanitized, and any special characters will be preserved. This may cause the export to fail and can cause other funny issues. Use at your own risk!') });
    userSettings.safeOutputFileName = !v;
}

export async function changeOutDir() {
    const newOutDir = await askForOutDir(appStore.get(outputDirAtom));
    if (newOutDir) setCustomOutDir(newOutDir);
}

/** Selects a recent/custom working dir (undefined = same as input) after checking that it is writable */
export async function setOutputDir(newOutDir: string | undefined) {
    try {
        await ensureWritableOutDir({ inputPath: appStore.get(filePathAtom), outDir: newOutDir });
        setCustomOutDir(newOutDir);
    } catch (err) {
        if (err instanceof DirectoryAccessDeclinedError) return;
        throw err;
    }
}

export function onOutputFormatUserChange(newFormat: string) {
    appStore.set(fileFormatAtom, newFormat);
    if (userSettings.outFormatLocked) {
        userSettings.outFormatLocked = newFormat === appStore.get(detectedFileFormatAtom) ? undefined : newFormat;
    }
}

export function toggleOutFormatLocked() {
    userSettings.outFormatLocked = userSettings.outFormatLocked ? undefined : appStore.get(fileFormatAtom);
}

export function setExportMode(newMode: ExportMode) {
    userSettings.autoMerge = newMode === 'merge' || newMode === 'merge+separate';
    userSettings.autoDeleteMergedSegments = newMode === 'merge';
    userSettings.segmentsToChaptersOnly = newMode === 'segments_to_chapters';
}

// Extract streams

async function extractStreamsWithFeedback({ streams, workingText, successText, osSuccessText, failText }: {
    streams: Parameters<typeof extractStreams>[0]['streams'];
    workingText: string;
    successText: string;
    osSuccessText: string;
    failText: string;
}) {
    try {
        setWorking({ text: workingText });
        const [firstExtractedPath] = await extractStreams({ customOutDir: appStore.get(customOutDirAtom), streams });
        if (!appStore.get(hideAllNotificationsAtom) && firstExtractedPath != null) {
            showOsNotification(osSuccessText);
            openExportFinishedDialog({ filePath: firstExtractedPath, children: successText });
        }
    } catch (err) {
        showOsNotification(failText);

        if (err instanceof RefuseOverwriteError) {
            showRefuseToOverwrite();
        } else if (err instanceof UserFacingError) {
            errorToast(err.message);
        } else {
            errorToast(failText);
            console.error(failText, err);
        }
    } finally {
        setWorking(undefined);
    }
}

export async function extractAllStreams() {
    if (!appStore.get(filePathAtom)) return;

    if (!(await confirmDialog({ description: i18n.t('Please confirm that you want to extract all tracks as separate files'), confirmButtonText: i18n.t('Extract all tracks') }))) return;

    if (isWorking()) return;
    appStore.set(streamsSelectorShownAtom, false);
    await extractStreamsWithFeedback({
        streams: appStore.get(mainCopiedStreamsAtom),
        workingText: i18n.t('Extracting all streams'),
        successText: i18n.t('All streams have been extracted as separate files'),
        osSuccessText: i18n.t('All tracks have been extracted'),
        failText: i18n.t('Failed to extract tracks'),
    });
}

export async function extractSingleStream(index: number) {
    if (!appStore.get(filePathAtom) || isWorking()) return;
    await extractStreamsWithFeedback({
        streams: appStore.get(mainStreamsAtom).filter((s) => s.index === index),
        workingText: i18n.t('Extracting track'),
        successText: i18n.t('Track has been extracted'),
        osSuccessText: i18n.t('Track has been extracted'),
        failText: i18n.t('Failed to extract track'),
    });
}

// Operations that create a new file and load it

export { tryFixInvalidDuration };

export async function tryDecimate() {
    if (!checkFileOpened()) return;
    const params = await openDecimateDialog();
    if (params == null) return;
    await runAndReloadFile({
        operation: async ({ filePath: fp, outPath }) => decimate({ filePath: fp, outPath, ...params }),
        loadingText: i18n.t('Decimating video'),
        nameSuffix: 'decimated',
    });
}

export async function copySegmentsToClipboard() {
    const selectedSegments = appStore.get(selectedSegmentsAtom);
    if (!appStore.get(isFileOpenedAtom) || selectedSegments.length === 0) return;
    await mainApi.writeClipboardText(formatTsvHuman(selectedSegments));
}
