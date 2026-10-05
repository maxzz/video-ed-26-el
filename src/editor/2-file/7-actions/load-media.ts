import i18n from 'i18next';
import invariant from 'tiny-invariant';
import type { FFprobeChapter } from '@shared/ffprobe';
import { parseFfprobeDuration } from '@shared/util';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { customOutDirAtom, effectiveExportModeAtom, hideAllNotificationsAtom, userSettings } from '@/editor/0-core/9-state/user-settings.ts';
import { formatTimecode, promptTimecode, timecodePlaceholderAtom } from '@/editor/0-core/9-state/timecode.ts';
import { isWorking, setProgress, setWorking, withErrorHandling } from '@/editor/0-core/9-state/working.ts';
import { resetAllFileState } from '@/editor/0-core/7-actions/lifecycle.ts';
import { askForImportChapters, confirmDialog, errorToast } from '@/editor/0-core/8-lib/app-dialogs.tsx';
import { DirectoryAccessDeclinedError } from '@/editor/0-core/8-lib/errors.ts';
import { getDefaultOutFormat, getStreamFps, getTimecodeFromStreams, mapRecommendedDefaultFormat, readFileFfprobeMeta, tryMapChaptersToEdl } from '@/editor/0-core/8-lib/ffmpeg/ffmpeg.ts';
import { doesPlayerSupportHevcPlayback, getAudioStreams, getRealVideoStreams, isAudioDefinitelyNotSupported, shouldCopyStreamByDefault, willPlayerProperlyHandleVideo } from '@/editor/0-core/8-lib/ffmpeg/streams.ts';
import { mainApi } from '@/editor/0-core/8-lib/main-api.ts';
import { basename, dirname, join } from '@/editor/0-core/8-lib/node-shims.ts';
import { showNotification } from '@/editor/0-core/8-lib/notifications.ts';
import { toast } from '@/editor/0-core/8-lib/toast.tsx';
import { findExistingHtml5FriendlyFile, getOutFileExtension, getPathReadAccessError, getSuffixedOutPath, havePermissionToReadFile, readFileStats, transferTimestamps } from '@/editor/0-core/8-lib/util.ts';
import { checkFileOpened } from '@/editor/3-player/7-actions/player-actions.ts';
import { fixInvalidDuration } from '@/editor/7-export/8-lib/ffmpeg-operations.ts';
import { commandedTimeAtom } from '@/editor/3-player/9-state/player-atoms.ts';
import { cutSegmentsAtom } from '@/editor/5-segments/9-state/segments-store.ts';
import { clearSegColorCounter, loadCutSegments, resetSegments } from '@/editor/5-segments/7-actions/segment-actions.ts';
import { isDurationValid } from '@/editor/5-segments/8-lib/segments.ts';
import { copyStreamIdsByFileAtom, setCopyStreamIdsForPath } from '@/editor/6-streams/9-state/streams-store.ts';
import { loadLlcProject } from '@/editor/9-edl/8-lib/edl-store.ts';
import { loadEdlFile } from '@/editor/9-edl/7-actions/edl-actions.ts';
import {
    cacheBusterAtom, detectedFileFormatAtom, detectedFpsAtom, externalFilesMetaAtom, ffmpegInfoAtom, fileFormatAtom, filePathAtom, isFileOpenedAtom,
    mainFileMetaAtom, mainStreamsAtom, allFilesMetaAtom, previewFilePathAtom, rotationAtom, shortestFlagAtom, startTimeOffsetAtom, usingDummyVideoAtom,
} from '../9-state/a-file-atoms.ts';
import { dialog_SendReport_open } from '../0-ui/dlg-send-report.tsx';
import { ensureAccessToSourceDir, ensureWritableOutDir } from './directory-access.ts';
import { html5ifyAndLoadWithPreferences } from './html5ify.ts';
import { getEdlFilePath } from './project-auto-save.ts';

const hevcPlaybackSupportedPromise = doesPlayerSupportHevcPlayback();
hevcPlaybackSupportedPromise.catch((err: unknown) => console.error(err));

export { showNotification };

export function showNotNativelySupportedMessage() {
    showNotification({ timer: 13000, text: i18n.t('File is not natively supported. Preview playback may be slow and of low quality, but the final export will be lossless. You may convert the file from the menu for a better preview.') });
}

export function showPreviewFileLoadedMessage(fileName: string) {
    showNotification({ icon: 'info', text: i18n.t('Loaded existing preview file: {{ fileName }}', { fileName }) });
}

/** Resets all per-file state of all features, including segments and their undo history */
export function closeFile() {
    resetAllFileState();
    resetSegments();
}

export async function closeFileWithConfirm() {
    if (!appStore.get(isFileOpenedAtom) || isWorking()) return;
    if (userSettings.askBeforeClose && !(await confirmDialog({ description: i18n.t('Are you sure you want to close the current file?') }))) return;
    closeFile();
}

export async function loadMedia({ filePath: fp, projectPath }: { filePath: string; projectPath?: string | undefined; }) {
    async function tryOpenProjectPath(path: string) {
        if (!(await mainApi.pathExists(path))) return false;
        await loadEdlFile({ path, type: 'llc' });
        return true;
    }

    const { storeProjectInWorkingDir, enableImportChapters, autoLoadTimecode, enableNativeHevc, outFormatLocked } = userSettings;
    const storeProjectInSourceDir = !storeProjectInWorkingDir;

    async function tryFindAndLoadProjectFile({ chapters, cod }: { chapters: FFprobeChapter[]; cod: string | undefined; }) {
        try {
            // First try to open from working dir
            if (await tryOpenProjectPath(getEdlFilePath(fp, cod))) return;

            // then try to open project from source file dir
            const sameDirEdlFilePath = getEdlFilePath(fp);
            if (await mainApi.pathExists(sameDirEdlFilePath)) {
                await ensureAccessToSourceDir(fp);
                await loadEdlFile({ path: sameDirEdlFilePath, type: 'llc' });
            }

            // OK, we didn't find a project file, instead maybe try to create project (segments) from chapters
            const edl = tryMapChaptersToEdl(chapters);
            if (edl.length > 0 && (enableImportChapters === 'always' || (enableImportChapters === 'ask' && (await askForImportChapters())))) {
                console.log('Convert chapters to segments', edl);
                loadCutSegments({ segments: edl, append: false });
            }
        } catch (err) {
            if (err instanceof DirectoryAccessDeclinedError) throw err;
            console.error('EDL load failed, but continuing', err);
            errorToast(`${i18n.t('Failed to load segments')} (${err instanceof Error && err.message})`);
        }
    }

    setWorking({ text: i18n.t('Loading file') });
    try {
        // Need to check if file is actually readable
        const pathReadAccessErrorCode = await getPathReadAccessError(fp);
        if (pathReadAccessErrorCode != null) {
            let errorMessage: string | undefined;
            if (pathReadAccessErrorCode === 'ENOENT') errorMessage = i18n.t('The media you tried to open does not exist');
            else if (['EACCES', 'EPERM'].includes(pathReadAccessErrorCode)) errorMessage = i18n.t('You do not have permission to access this file');
            else errorMessage = i18n.t('Could not open media due to error {{errorCode}}', { errorCode: pathReadAccessErrorCode });
            errorToast(errorMessage);
            return;
        }

        // Not sure why this one is needed, but I think sometimes fs.access doesn't fail but it fails when actually trying to read
        if (!(await havePermissionToReadFile(fp))) {
            errorToast(i18n.t('You do not have permission to access this file'));
            return;
        }

        const ffprobeMeta = await readFileFfprobeMeta(fp);
        const fileStats = await readFileStats(fp);

        const fileFormatNew = await getDefaultOutFormat({ filePath: fp, fileMeta: ffprobeMeta });
        if (!fileFormatNew) throw new Error('Unable to determine file format');

        const timecode = autoLoadTimecode ? getTimecodeFromStreams(ffprobeMeta.streams) : undefined;

        const [firstVideoStream] = getRealVideoStreams(ffprobeMeta.streams);
        const [firstAudioStream] = getAudioStreams(ffprobeMeta.streams);

        const copyStreamIdsForPathNew = Object.fromEntries(ffprobeMeta.streams.map((stream) => [
            stream.index, shouldCopyStreamByDefault(stream),
        ]));

        const validDuration = isDurationValid(parseFloat(ffprobeMeta.format.duration));

        const hevcPlaybackSupported = enableNativeHevc && await hevcPlaybackSupportedPromise;

        // need to ensure we have access to write to working directory
        const cod = await ensureWritableOutDir({ inputPath: fp, outDir: appStore.get(customOutDirAtom) });

        // if storeProjectInSourceDir is true, we will be writing project file to input path's dir, so ensure that one too
        if (storeProjectInSourceDir) await ensureAccessToSourceDir(fp);

        const existingHtml5FriendlyFile = await findExistingHtml5FriendlyFile(fp, cod);

        const needsAutoHtml5ify = !existingHtml5FriendlyFile && !willPlayerProperlyHandleVideo({ streams: ffprobeMeta.streams, hevcPlaybackSupported, isMasBuild: false }) && validDuration;

        console.log('loadMedia', { filePath: fp, customOutDir: cod, projectPath });

        // BEGIN STATE UPDATES:

        closeFile();
        clearSegColorCounter();

        if (existingHtml5FriendlyFile) {
            console.log('Found existing html5 friendly file', existingHtml5FriendlyFile.path);
            appStore.set(usingDummyVideoAtom, existingHtml5FriendlyFile.usingDummyVideo);
            appStore.set(previewFilePathAtom, existingHtml5FriendlyFile.path);
        }

        if (needsAutoHtml5ify) {
            // Try to auto-html5ify if there are known issues with this file
            // 'fastest' works with almost all video files
            await html5ifyAndLoadWithPreferences(cod, fp, 'fastest', firstVideoStream != null, firstAudioStream != null);
        }

        if (projectPath) {
            await loadEdlFile({ path: projectPath, type: 'llc' });
        } else {
            await tryFindAndLoadProjectFile({ chapters: ffprobeMeta.chapters, cod });
        }

        function getFps() {
            if (firstVideoStream != null) return getStreamFps(firstVideoStream);
            if (firstAudioStream != null) return getStreamFps(firstAudioStream);
            return undefined;
        }

        if (timecode) appStore.set(startTimeOffsetAtom, timecode);
        appStore.set(detectedFpsAtom, getFps());
        appStore.set(mainFileMetaAtom, {
            ffprobeMeta,
            stats: { size: fileStats.size, atime: fileStats.atimeMs, mtime: fileStats.mtimeMs, ctime: fileStats.ctime.getTime(), birthtime: fileStats.birthtime.getTime() },
        });
        setCopyStreamIdsForPath(fp, () => copyStreamIdsForPathNew);
        appStore.set(detectedFileFormatAtom, fileFormatNew);
        if (outFormatLocked) {
            appStore.set(fileFormatAtom, outFormatLocked);
        } else {
            const recommendedDefaultFormat = mapRecommendedDefaultFormat({ sourceFormat: fileFormatNew, streams: ffprobeMeta.streams });
            if (recommendedDefaultFormat.message) showNotification({ icon: 'info', text: recommendedDefaultFormat.message });
            appStore.set(fileFormatAtom, recommendedDefaultFormat.format);
        }

        // only show one toast, or else we will only show the last one
        if (existingHtml5FriendlyFile && !existingHtml5FriendlyFile.usingDummyVideo) {
            showPreviewFileLoadedMessage(basename(existingHtml5FriendlyFile.path));
        } else if (needsAutoHtml5ify) {
            showNotNativelySupportedMessage();
        } else if (isAudioDefinitelyNotSupported(ffprobeMeta.streams)) {
            showNotification({ icon: 'info', text: i18n.t('The audio track is not supported while previewing. You can convert to a supported format from the menu') });
        } else if (!validDuration) {
            toast.fire({ icon: 'warning', timer: 10000, text: i18n.t('This file does not have a valid duration. This may cause issues. You can try to fix the file\'s duration from the File menu') });
        }

        // This needs to be last, because it triggers <video> to load the video
        // If not, onVideoError might be triggered before setWorking() has been cleared.
        // https://github.com/mifi/lossless-cut/issues/515
        appStore.set(filePathAtom, fp);
    } catch (err) {
        if (err instanceof DirectoryAccessDeclinedError) return;
        closeFile();
        throw err;
    }
}

export async function userOpenSingleFile({ path: pathIn, isLlcProject }: { path: string; isLlcProject?: boolean; }) {
    let path = pathIn;
    let projectPath: string | undefined;

    // Open .llc AND media referenced within
    if (isLlcProject) {
        console.log('Loading LLC project', path);
        const project = await loadLlcProject(path);
        const { mediaFileName } = project;

        console.log({ mediaFileName });
        if (!mediaFileName) return;

        const mediaFilePath = join(dirname(path), mediaFileName);

        if (!(await mainApi.pathExists(mediaFilePath))) {
            errorToast(i18n.t('The media file referenced by the project file you tried to open does not exist in the same directory as the project file: {{mediaFileName}}', { mediaFileName }));
            return;
        }

        projectPath = path;

        // We might need to get user's access to the project file's directory, in order to read the media file
        try {
            await ensureAccessToSourceDir(mediaFilePath);
        } catch (err) {
            if (err instanceof DirectoryAccessDeclinedError) return;
        }
        path = mediaFilePath;
    }

    await loadMedia({ filePath: path, projectPath });
}

export async function runAndReloadFile({ operation, loadingText, errorText = i18n.t('The operation failed'), nameSuffix }: {
    operation: (params: { filePath: string; outPath: string; }) => Promise<string>;
    loadingText: string;
    errorText?: string;
    nameSuffix: string;
}) {
    if (!checkFileOpened() || isWorking()) return;
    try {
        setWorking({ text: loadingText });
        setProgress(0);
        await withErrorHandling(async () => {
            const fileFormat = appStore.get(fileFormatAtom);
            const filePath = appStore.get(filePathAtom);
            invariant(fileFormat != null);
            invariant(filePath != null);
            const ext = getOutFileExtension({ outFormat: fileFormat, filePath });
            const outPath = getSuffixedOutPath({ customOutDir: appStore.get(customOutDirAtom), filePath, nameSuffix: `${nameSuffix}${ext}` });
            const newPath = await operation({ filePath, outPath });
            await transferTimestamps({
                inPath: filePath,
                outPath,
                duration: undefined,
                treatInputFileModifiedTimeAsStart: userSettings.treatInputFileModifiedTimeAsStart,
                treatOutputFileModifiedTimeAsStart: userSettings.treatOutputFileModifiedTimeAsStart,
            });

            await loadMedia({ filePath: newPath });
        }, errorText);
    } finally {
        setWorking(undefined);
        setProgress(undefined);
    }
}

export async function tryFixInvalidDuration() {
    await runAndReloadFile({
        operation: async ({ filePath, outPath }) => {
            const path = await fixInvalidDuration({ filePath, outPath, onProgress: setProgress });
            showNotification({ icon: 'info', text: i18n.t('Duration has been fixed') });
            return path;
        },
        loadingText: i18n.t('Fixing file duration'),
        nameSuffix: 'reformatted',
    });
}

/** Reloads the <video> element (e.g. after the file was modified on disk) */
export function reloadFile() {
    appStore.set(cacheBusterAtom, (v) => v + 1);
}

export function setStartTimeOffset(offset: number) {
    appStore.set(startTimeOffsetAtom, offset);
}

export async function askStartTimeOffset() {
    const startTimeOffset = appStore.get(startTimeOffsetAtom);
    const newStartTimeOffset = await promptTimecode({
        initialValue: formatTimecode({ seconds: startTimeOffset }),
        title: i18n.t('Set custom start time offset'),
        description: i18n.t('Instead of video apparently starting at 0, you can offset by a specified value. This only applies to the preview inside LosslessCut and does not modify the file in any way. (Useful for viewing/cutting videos according to timecodes)'),
        inputPlaceholder: appStore.get(timecodePlaceholderAtom),
        allowRelative: true,
    });

    if (newStartTimeOffset === undefined || newStartTimeOffset.duration < 0) return;

    const duration = newStartTimeOffset.relDirection != null ? newStartTimeOffset.duration * newStartTimeOffset.relDirection : newStartTimeOffset.duration;
    setStartTimeOffset(duration);
}

export function makeCursorTimeZero() {
    setStartTimeOffset(-appStore.get(commandedTimeAtom));
}

/** Port of upstream openSendReportDialogWithState */
export function openSendReportDialogWithState(err?: unknown) {
    const { keyBindings: _keyBindings, ...settings } = userSettings;
    const state = {
        ...settings,
        ffmpegVersion: appStore.get(ffmpegInfoAtom)?.program_version.version,

        filePath: appStore.get(filePathAtom),
        fileFormat: appStore.get(fileFormatAtom),
        externalFilesMeta: appStore.get(externalFilesMetaAtom),
        mainStreams: appStore.get(mainStreamsAtom),
        copyStreamIdsByFile: appStore.get(copyStreamIdsByFileAtom),
        cutSegments: appStore.get(cutSegmentsAtom).map((s) => ({ start: s.start, end: s.end })),
        mainFileFormat: appStore.get(mainFileMetaAtom)?.ffprobeMeta.format,
        rotation: appStore.get(rotationAtom),
        shortestFlag: appStore.get(shortestFlagAtom),
        effectiveExportMode: appStore.get(effectiveExportModeAtom),
    };

    dialog_SendReport_open({ err, state });
}

export function isFileDurationValid() {
    return isDurationValid(parseFfprobeDuration(appStore.get(mainFileMetaAtom)?.ffprobeMeta.format.duration));
}
