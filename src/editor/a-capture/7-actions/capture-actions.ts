import i18n from 'i18next';
import invariant from 'tiny-invariant';
import type { CaptureFormat } from '@shared/types.ts';
import type { SegmentBase } from '@/editor/0-core/8-lib/types.ts';
import { jotaiDefaultStore } from '@/utils/local-utils/9-jotai-default-store.ts';
import { customOutDirAtom, userSettings } from '@/editor/0-core/9-state/user-settings.ts';
import { handleError, isWorking, setProgress, setWorking, withErrorHandling } from '@/editor/0-core/9-state/working.ts';
import { getFrameCount } from '@/editor/0-core/9-state/timecode.ts';
import { detectedFpsAtom, fileDurationAtom, filePathAtom, outputDirAtom, paramsByFileAtom, usingPreviewFileAtom } from '@/editor/2-file/9-state/a-file-atoms.ts';
import { showNotification, showOsNotification } from '@/editor/0-core/8-lib/notifications.ts';
import { addStreamSourceFile } from '@/editor/6-streams/7-actions/streams-actions.tsx';
import { videoElementAtom } from '@/editor/3-player/9-state/player-atoms.ts';
import { getRelevantTime } from '@/editor/3-player/7-actions/player-actions.ts';
import { currentCutSegAtom, selectedSegmentsAtom } from '@/editor/5-segments/9-state/segments-store.ts';
import { captureFrameFromFfmpeg, captureFrameFromTag, captureFrameToClipboard, captureFramesRange } from '../8-lib/frame-capture.ts';
import { askExtractFramesAsImages } from '../8-lib/extract-frames-dialog.ts';
import { openExportFinishedDialog } from '@/editor/7-export/0-ui/finished-dialogs.tsx';

// Port of upstream App.tsx captureSnapshot*, extract*FramesAsImages, toggleCaptureFormat

const hideAllNotifications = () => userSettings.hideNotifications === 'all';

function captureCurrentFrameWithFfmpeg(filePath: string) {
    return captureFrameFromFfmpeg({
        customOutDir: jotaiDefaultStore.get(customOutDirAtom),
        filePath,
        time: getRelevantTime(),
        captureFormat: userSettings.captureFormat,
        quality: userSettings.captureFrameQuality,
        fileDuration: jotaiDefaultStore.get(fileDurationAtom),
    });
}

export async function captureSnapshot() {
    const filePath = jotaiDefaultStore.get(filePathAtom);
    if (!filePath || isWorking()) return;
    try {
        setWorking({ text: i18n.t('Exporting') });

        await withErrorHandling(async () => {
            const video = jotaiDefaultStore.get(videoElementAtom);
            invariant(video != null);
            const usingFfmpeg = jotaiDefaultStore.get(usingPreviewFileAtom) || userSettings.captureFrameMethod === 'ffmpeg';
            const outPath = usingFfmpeg
                ? await captureCurrentFrameWithFfmpeg(filePath)
                : await captureFrameFromTag({
                    customOutDir: jotaiDefaultStore.get(customOutDirAtom),
                    filePath,
                    time: getRelevantTime(),
                    captureFormat: userSettings.captureFormat,
                    quality: userSettings.captureFrameQuality,
                    video,
                    fileDuration: jotaiDefaultStore.get(fileDurationAtom),
                });

            if (!hideAllNotifications()) openExportFinishedDialog({ filePath: outPath, children: `${i18n.t('Screenshot captured to:')} ${outPath}` });
        }, i18n.t('Failed to capture frame'));
    } finally {
        setWorking(undefined);
    }
}

export async function captureSnapshotToClipboard() {
    const filePath = jotaiDefaultStore.get(filePathAtom);
    if (!filePath || isWorking()) return;
    try {
        setWorking({ text: i18n.t('Exporting') });

        await withErrorHandling(async () => {
            await captureFrameToClipboard({ filePath, time: getRelevantTime(), quality: userSettings.captureFrameQuality });
            showNotification({ icon: 'info', title: i18n.t('Screenshot captured clipboard') });
        }, i18n.t('Failed to capture frame'));
    } finally {
        setWorking(undefined);
    }
}

function setStreamDispositionAttachedPic(fileId: string, streamId: number) {
    jotaiDefaultStore.set(paramsByFileAtom, (old) => {
        const next = new Map(old);
        const fileParams = next.get(fileId) ?? { metadata: {}, paramsByStream: new Map() };
        const paramsByStream = new Map(fileParams.paramsByStream);
        paramsByStream.set(streamId, { metadata: {}, ...paramsByStream.get(streamId), disposition: 'attached_pic' });
        next.set(fileId, { ...fileParams, paramsByStream });
        return next;
    });
}

export async function captureSnapshotAsCoverArt() {
    const filePath = jotaiDefaultStore.get(filePathAtom);
    if (!filePath) return;
    await withErrorHandling(async () => {
        const path = await captureCurrentFrameWithFfmpeg(filePath);
        const fileMeta = await addStreamSourceFile(path);
        if (!fileMeta) return;
        const firstIndex = fileMeta.streams[0]!.index;
        setStreamDispositionAttachedPic(path, firstIndex);
        showNotification({ text: i18n.t('Current frame has been set as cover art') });
    }, i18n.t('Failed to capture frame'));
}

export async function extractSegmentsFramesAsImages(segments: SegmentBase[]) {
    const filePath = jotaiDefaultStore.get(filePathAtom);
    const detectedFps = jotaiDefaultStore.get(detectedFpsAtom);
    if (!filePath || detectedFps == null || isWorking() || segments.length === 0) return;
    const segmentsNumFrames = segments.reduce((acc, { start, end }) => acc + (end == null ? 1 : (getFrameCount(end - start) ?? 0)), 0);
    // If all segments are markers, we shall export every marker as a file and therefore we don't have to ask user
    const areAllSegmentsMarkers = segments.every((seg) => seg.end == null);
    const captureFramesResponse = areAllSegmentsMarkers
        ? { filter: undefined, estimatedMaxNumFiles: segmentsNumFrames }
        : await askExtractFramesAsImages({ segmentsNumFrames, plural: segments.length > 1, fps: detectedFps });

    if (captureFramesResponse == null) return;

    try {
        setWorking({ text: i18n.t('Extracting frames') });
        console.log('Extracting frames as images', { captureFramesResponse });

        setProgress(0);

        let lastOutPath: string | undefined;

        const segmentProgresses: Record<number, number> = {};
        const handleSegmentProgress = (segIndex: number, segmentProgress: number) => {
            segmentProgresses[segIndex] = segmentProgress;
            const totalProgress = segments.reduce((acc, _ignored, index) => acc + (segmentProgresses[index] ?? 0), 0);
            setProgress(totalProgress / segments.length);
        };

        for (const [index, segment] of segments.entries()) {
            const { start, end } = segment;
            lastOutPath = await captureFramesRange({
                customOutDir: jotaiDefaultStore.get(customOutDirAtom),
                filePath,
                fps: detectedFps,
                fromTime: start,
                toTime: end,
                estimatedMaxNumFiles: captureFramesResponse.estimatedMaxNumFiles,
                captureFormat: userSettings.captureFormat,
                quality: userSettings.captureFrameQuality,
                filter: captureFramesResponse.filter,
                outputTimestamps: userSettings.captureFrameFileNameFormat === 'timestamp',
                onProgress: (segmentProgress) => handleSegmentProgress(index, segmentProgress),
            });
        }
        if (!hideAllNotifications() && lastOutPath != null) {
            showOsNotification(i18n.t('Frames have been extracted'));
            openExportFinishedDialog({ filePath: lastOutPath, children: i18n.t('Frames extracted to: {{path}}', { path: jotaiDefaultStore.get(outputDirAtom) }) });
        }
    } catch (err) {
        showOsNotification(i18n.t('Failed to extract frames'));
        handleError({ err, title: i18n.t('Failed to extract frames') });
    } finally {
        setWorking(undefined);
        setProgress(undefined);
    }
}

export function extractCurrentSegmentFramesAsImages() {
    const currentCutSeg = jotaiDefaultStore.get(currentCutSegAtom);
    if (currentCutSeg != null) return extractSegmentsFramesAsImages([currentCutSeg]);
    return undefined;
}

export const extractSelectedSegmentsFramesAsImages = () => extractSegmentsFramesAsImages(jotaiDefaultStore.get(selectedSegmentsAtom));

const captureFormats: CaptureFormat[] = ['jpeg', 'png', 'webp'];

export function toggleCaptureFormat() {
    let index = captureFormats.indexOf(userSettings.captureFormat);
    if (index === -1) index = 0;
    index += 1;
    if (index >= captureFormats.length) index = 0;
    userSettings.captureFormat = captureFormats[index]!;
}
