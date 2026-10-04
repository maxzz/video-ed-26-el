import i18n from 'i18next';
import invariant from 'tiny-invariant';
import type { DetectedSegment } from '@shared/ipc-contract.ts';
import { appStore } from '@/editor/0-core/0-state/store.ts';
import { userSettings } from '@/editor/0-core/0-state/user-settings.ts';
import { handleError, isWorking, setProgress, setWorking } from '@/editor/0-core/0-state/working.ts';
import { isAbortedError } from '@/editor/0-core/2-lib/util.ts';
import type { FfmpegDialog } from '@/editor/0-core/2-lib/ffmpeg/ffmpeg-parameters.ts';
import { blackDetect, detectSceneChanges as ffmpegDetectSceneChanges, silenceDetect } from '@/editor/0-core/2-lib/ffmpeg/ff-remote.ts';
import { fileDurationAtom, filePathAtom } from '@/editor/2-file/0-state/file-atoms.ts';
import { activeAudioStreamIndexesAtom, activeVideoStreamIndexAtom } from '@/editor/3-player/0-state/player-atoms.ts';
import { seekAbs } from '@/editor/3-player/1-actions/player-actions.ts';
import { currentCutSegOrWholeTimelineAtom } from '@/editor/5-segments/0-state/segments-store.ts';
import { deleteCurrentCutSeg, loadCutSegments } from '@/editor/5-segments/1-actions/segment-actions.ts';
import { appendLastCommandsLog } from '@/editor/7-export/0-state/export-atoms.ts';
import { getFfmpegParameters, type ParameterDialogParameters, setFfmpegParametersForDialog } from '../0-state/detect-atoms.ts';
import { showParametersDialog } from '../3-ui/parameters-dialog.tsx';

// Port of the detection part of upstream useSegments

interface DetectFnParams {
    filePath: string;
    onSegmentDetected: (segment: DetectedSegment) => void;
    signal: AbortSignal;
}

/** Runs a detection; every detected segment is appended live and the player seeks to it */
async function detectSegments({ name, workingText, errorText, fn }: {
    name: string;
    workingText: string;
    errorText: string;
    fn: (params: DetectFnParams) => Promise<{ ffmpegCommand: string; }>;
}) {
    const filePath = appStore.get(filePathAtom);
    if (!filePath || isWorking()) return;
    const abortController = new AbortController();
    try {
        setWorking({ text: workingText, abortController });
        setProgress(0);

        const { ffmpegCommand } = await fn({
            filePath,
            signal: abortController.signal,
            onSegmentDetected: (detectedSegment) => {
                console.log('Detected', name, detectedSegment);
                loadCutSegments({ segments: [detectedSegment], append: true, getNextCurrentSegIndex: (edl) => edl.length - 1, clampDuration: appStore.get(fileDurationAtom) });
                seekAbs(detectedSegment.start);
            },
        });
        appendLastCommandsLog(ffmpegCommand);
    } catch (err) {
        if (!isAbortedError(err)) handleError({ err, title: errorText });
    } finally {
        setWorking(undefined);
        setProgress(undefined);
    }
}

/** Asks for the parameters, then removes the current segment, because detection replaces it with the detected segments */
async function askParameters(dialogType: FfmpegDialog, docUrl?: string) {
    if (!appStore.get(filePathAtom) || isWorking()) return undefined;
    const parameters = await showParametersDialog({ title: i18n.t('Enter parameters'), dialogType, parameters: getFfmpegParameters(dialogType), docUrl });
    if (parameters == null) return undefined;
    setFfmpegParametersForDialog(dialogType, parameters);
    return parameters;
}

function getBoundingMode({ mode }: ParameterDialogParameters) {
    invariant(mode === '1' || mode === '2');
    return mode === '1';
}

export async function detectBlackScenes() {
    const { start, end } = appStore.get(currentCutSegOrWholeTimelineAtom);
    const parameters = await askParameters('blackdetect', 'https://ffmpeg.org/ffmpeg-filters.html#blackdetect');
    if (parameters == null) return;
    const { mode: _mode, ...filterOptions } = parameters;
    const boundingMode = getBoundingMode(parameters);
    deleteCurrentCutSeg();
    await detectSegments({
        name: 'blackScenes',
        workingText: i18n.t('Detecting black scenes'),
        errorText: i18n.t('Failed to detect black scenes'),
        fn: async ({ filePath, onSegmentDetected, signal }) => blackDetect({
            filePath, streamId: appStore.get(activeVideoStreamIndexAtom), filterOptions, boundingMode, onProgress: setProgress, onSegmentDetected, signal, from: start, to: end, ffmpegHwaccel: userSettings.ffmpegHwaccel,
        }),
    });
}

export async function detectSilentScenes() {
    const { start, end } = appStore.get(currentCutSegOrWholeTimelineAtom);
    const parameters = await askParameters('silencedetect', 'https://ffmpeg.org/ffmpeg-filters.html#silencedetect');
    if (parameters == null) return;
    const { mode: _mode, ...filterOptions } = parameters;
    const boundingMode = getBoundingMode(parameters);
    deleteCurrentCutSeg();
    await detectSegments({
        name: 'silentScenes',
        workingText: i18n.t('Detecting silent scenes'),
        errorText: i18n.t('Failed to detect silent scenes'),
        fn: async ({ filePath, onSegmentDetected, signal }) => silenceDetect({
            filePath, streamId: [...appStore.get(activeAudioStreamIndexesAtom)][0], filterOptions, boundingMode, onProgress: setProgress, onSegmentDetected, signal, from: start, to: end, ffmpegHwaccel: userSettings.ffmpegHwaccel,
        }),
    });
}

export async function detectSceneChanges() {
    const { start, end } = appStore.get(currentCutSegOrWholeTimelineAtom);
    const parameters = await askParameters('sceneChange');
    if (parameters == null) return;
    const { minChange } = parameters;
    invariant(minChange != null);
    deleteCurrentCutSeg();
    await detectSegments({
        name: 'sceneChanges',
        workingText: i18n.t('Detecting scene changes'),
        errorText: i18n.t('Failed to detect scene changes'),
        fn: async ({ filePath, onSegmentDetected, signal }) => ffmpegDetectSceneChanges({
            filePath, streamId: appStore.get(activeVideoStreamIndexAtom), minChange, onProgress: setProgress, onSegmentDetected, signal, from: start, to: end, ffmpegHwaccel: userSettings.ffmpegHwaccel,
        }),
    });
}
