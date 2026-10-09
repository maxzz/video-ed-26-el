import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import i18n from "i18next";
import invariant from "tiny-invariant";

import { userSettings } from "@/editor/0-core/9-state/user-settings";

import { type DetectedSegment } from "@shared/ipc-contract";
import { handleError, isWorking, setProgress, setWorking } from "@/editor/0-core/9-state/working";
import { isAbortedError } from "@/editor/0-core/8-lib/util";
import { type FfmpegDialog } from "@/editor/0-core/8-lib/ffmpeg/ffmpeg-parameters";
import { blackDetect, detectSceneChanges as ffmpegDetectSceneChanges, silenceDetect } from "@/editor/0-core/8-lib/ffmpeg/ff-remote";
import { fileDurationAtom, filePathAtom } from "@/editor/2-file/9-state/a-file-atoms";
import { activeAudioStreamIndexesAtom, activeVideoStreamIndexAtom } from "@/editor/3-player/9-state/a-player-atoms";
import { seekAbs } from "@/editor/3-player/7-actions/player-actions";
import { currentCutSegOrWholeTimelineAtom } from "@/editor/5-segments/9-state/a-segments-store";
import { deleteCurrentCutSeg, loadCutSegments } from "@/editor/5-segments/7-actions/segment-actions";
import { appendLastCommandsLog } from "@/editor/7-export/9-state/export-atoms";
import { getFfmpegParameters, type ParameterDialogParameters, setFfmpegParametersForDialog } from "./a-detect-atoms";
import { showDialog_Parameters } from "./2-parameters-dialog";

// Port of the detection part of upstream useSegments

//---------------------------------------------------------------------------

/** Asks for the parameters, then removes the current segment, because detection replaces it with the detected segments */
async function askDialog_Parameters(dialogType: FfmpegDialog, docUrl?: string) {
    if (!jotaiDefaultStore.get(filePathAtom) || isWorking()) {
        return undefined;
    }
    const parameters = await showDialog_Parameters({ title: i18n.t('Enter parameters'), dialogType, parameters: getFfmpegParameters(dialogType), docUrl });
    if (parameters == null) {
        return undefined;
    }
    setFfmpegParametersForDialog(dialogType, parameters);
    return parameters;
}

//---------------------------------------------------------------------------

export async function tmcmd_tools_dialog_DetectBlackScenes() {
    const { start, end } = jotaiDefaultStore.get(currentCutSegOrWholeTimelineAtom);
    const parameters = await askDialog_Parameters('blackdetect', 'https://ffmpeg.org/ffmpeg-filters.html#blackdetect');
    if (parameters == null) {
        return;
    }
    const { mode: _mode, ...filterOptions } = parameters;
    const boundingMode = getBoundingMode(parameters);
    deleteCurrentCutSeg();

    await detectSegments({
        name: 'blackScenes',
        workingText: i18n.t('Detecting black scenes'),
        errorText: i18n.t('Failed to detect black scenes'),
        fn: async ({ filePath, onSegmentDetected, signal }) => blackDetect({
            filePath, streamId: jotaiDefaultStore.get(activeVideoStreamIndexAtom), filterOptions, boundingMode, onProgress: setProgress, onSegmentDetected, signal, from: start, to: end, ffmpegHwaccel: userSettings.ffmpegHwaccel,
        }),
    });
}

function getBoundingMode({ mode }: ParameterDialogParameters) {
    invariant(mode === '1' || mode === '2');
    return mode === '1';
}

//---------------------------------------------------------------------------

export async function tmcmd_tools_dialog_DetectSilentScenes() {
    const { start, end } = jotaiDefaultStore.get(currentCutSegOrWholeTimelineAtom);
    const parameters = await askDialog_Parameters('silencedetect', 'https://ffmpeg.org/ffmpeg-filters.html#silencedetect');
    if (parameters == null) {
        return;
    }
    const { mode: _mode, ...filterOptions } = parameters;
    const boundingMode = getBoundingMode(parameters);
    deleteCurrentCutSeg();
    await detectSegments({
        name: 'silentScenes',
        workingText: i18n.t('Detecting silent scenes'),
        errorText: i18n.t('Failed to detect silent scenes'),
        fn: async ({ filePath, onSegmentDetected, signal }) => silenceDetect({
            filePath, streamId: [...jotaiDefaultStore.get(activeAudioStreamIndexesAtom)][0], filterOptions, boundingMode, onProgress: setProgress, onSegmentDetected, signal, from: start, to: end, ffmpegHwaccel: userSettings.ffmpegHwaccel,
        }),
    });
}

//---------------------------------------------------------------------------

export async function tmcmd_tools_dialog_DetectSceneChanges() {
    const { start, end } = jotaiDefaultStore.get(currentCutSegOrWholeTimelineAtom);
    const parameters = await askDialog_Parameters('sceneChange');
    if (parameters == null) {
        return;
    }
    const { minChange } = parameters;
    invariant(minChange != null);
    deleteCurrentCutSeg();
    await detectSegments({
        name: 'sceneChanges',
        workingText: i18n.t('Detecting scene changes'),
        errorText: i18n.t('Failed to detect scene changes'),
        fn: async ({ filePath, onSegmentDetected, signal }) => ffmpegDetectSceneChanges({
            filePath, streamId: jotaiDefaultStore.get(activeVideoStreamIndexAtom), minChange, onProgress: setProgress, onSegmentDetected, signal, from: start, to: end, ffmpegHwaccel: userSettings.ffmpegHwaccel,
        }),
    });
}

//---------------------------------------------------------------------------

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
    const filePath = jotaiDefaultStore.get(filePathAtom);
    if (!filePath || isWorking()) {
        return;
    }

    const abortController = new AbortController();
    try {
        setWorking({ text: workingText, abortController });
        setProgress(0);

        const { ffmpegCommand } = await fn({
            filePath,
            signal: abortController.signal,
            onSegmentDetected: (detectedSegment) => {
                console.log('Detected', name, detectedSegment);
                loadCutSegments({ segments: [detectedSegment], append: true, getNextCurrentSegIndex: (edl) => edl.length - 1, clampDuration: jotaiDefaultStore.get(fileDurationAtom) });
                seekAbs(detectedSegment.start);
            },
        });
        appendLastCommandsLog(ffmpegCommand);
    } catch (err) {
        if (!isAbortedError(err)) {
            handleError({ err, title: errorText });
        }
    } finally {
        setWorking(undefined);
        setProgress(undefined);
    }
}
