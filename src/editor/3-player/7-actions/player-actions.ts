import i18n from 'i18next';
import invariant from 'tiny-invariant';
import type { PlaybackMode } from '@/editor/0-core/8-lib/types.ts';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { userSettings } from '@/editor/0-core/9-state/user-settings.ts';
import { showPlaybackFailedMessage } from '@/editor/0-core/8-lib/app-dialogs.tsx';
import { toast } from '@/editor/0-core/8-lib/toast.tsx';
import { adjustRate } from '@/editor/0-core/8-lib/rate-calculator.ts';
import { getFrameCountRaw } from '@/editor/9-edl/8-lib/edl-formats.ts';
import { enableAudioTrack, enableVideoTrack } from '@/editor/0-core/8-lib/ffmpeg/streams.ts';
import { detectedFpsAtom, fileDurationAtom, filePathAtom, isFileOpenedAtom, previewFilePathAtom, usingDummyVideoAtom } from '@/editor/2-file/9-state/file-atoms.ts';
import { cutSegmentsAtom, currentCutSegAtom, currentSegIndexAtom, findSegmentsAtCursor, selectedSegmentsAtom, currentSegIndexSafeAtom } from '@/editor/5-segments/9-state/segments-store.ts';
import { filterNonMarkers, getPlaybackAction } from '@/editor/5-segments/8-lib/segments.ts';
import {
    activeAudioStreamIndexesAtom, activeVideoStreamIndexAtom, commandedTimeAtom, hideCompatPlayerAtom, outputPlaybackRateAtom,
    playbackModeAtom, playbackRateAtom, playerTimeAtom, playingAtom, videoElementAtom,
} from '../9-state/player-atoms.ts';

const getVideo = () => appStore.get(videoElementAtom);

export function setPlaybackRate(rate: number) {
    const video = getVideo();
    if (video) video.playbackRate = rate;
    appStore.set(playbackRateAtom, rate);
}

export function setOutputPlaybackRate(rate: number) {
    appStore.set(outputPlaybackRateAtom, rate);
    const video = getVideo();
    if (video) video.playbackRate = rate;
}

export function setPlaybackMode(mode: PlaybackMode | undefined) {
    appStore.set(playbackModeAtom, mode);
}

// https://kitchen.vibbio.com/blog/optimizing-html5-video-scrubbing/
let seekingTimer: ReturnType<typeof setTimeout> | undefined;
let seekTo: number | undefined;

function smoothSeek(time: number) {
    const video = getVideo();
    if (!video) return;
    if (seekingTimer) {
        seekTo = time;
    } else {
        video.currentTime = time;
        // safety precaution:
        seekingTimer = setTimeout(() => {
            seekingTimer = undefined;
        }, 1000);
    }
}

export function onSeeked() {
    const video = getVideo();
    if (seekTo != null && video) {
        video.currentTime = seekTo;
        seekTo = undefined;
    } else {
        clearTimeout(seekingTimer);
        seekingTimer = undefined;
    }
}

export function setCommandedTime(time: number) {
    appStore.set(commandedTimeAtom, time);
}

export function seekAbs(val: number | undefined) {
    if (appStore.get(filePathAtom) == null) return;
    const video = getVideo();
    if (video == null || val == null || Number.isNaN(val)) return;
    let outVal = val;
    if (outVal < 0) outVal = 0;
    if (outVal > video.duration) outVal = video.duration;

    smoothSeek(outVal);
    setCommandedTime(outVal);
}

/** Current time without subscribing to per-frame updates */
export function getRelevantTime() {
    return (appStore.get(playingAtom) ? getVideo()?.currentTime : appStore.get(commandedTimeAtom)) || 0;
}

export function seekRel(val: number) {
    seekAbs(getRelevantTime() + val);
}

function onPlayingChange(val: boolean) {
    appStore.set(playingAtom, val);
    const video = getVideo();
    if (!val && video) setCommandedTime(video.currentTime);
}

export const onStartPlaying = () => onPlayingChange(true);
export const onStopPlaying = () => onPlayingChange(false);

export function onVideoAbort() {
    appStore.set(playingAtom, false); // we want to preserve current time https://github.com/mifi/lossless-cut/issues/1674#issuecomment-1658937716
    setPlaybackMode(undefined);
}

export function pause() {
    if (!appStore.get(filePathAtom) || !appStore.get(playingAtom)) return;
    getVideo()?.pause();
}

export function play(resetPlaybackRate?: boolean) {
    if (!appStore.get(filePathAtom) || appStore.get(playingAtom)) return;
    if (resetPlaybackRate) setPlaybackRate(appStore.get(outputPlaybackRateAtom));
    getVideo()?.play().catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError' && 'code' in err && err.code === 20) { // "The play() request was interrupted by a call to pause()."
            console.error(err);
        } else {
            showPlaybackFailedMessage();
        }
    });
}

function segmentAtCursor() {
    const cutSegments = appStore.get(cutSegmentsAtom);
    const [index] = findSegmentsAtCursor(cutSegments, appStore.get(commandedTimeAtom));
    return index != null ? cutSegments[index] : undefined;
}

export function togglePlay({ resetPlaybackRate, requestPlaybackMode }: { resetPlaybackRate?: boolean; requestPlaybackMode?: PlaybackMode; } = {}) {
    setPlaybackMode(requestPlaybackMode);

    if (appStore.get(playingAtom)) {
        pause();
        return;
    }

    // If we are using a special playback mode, we might need to do more:
    const playbackMode = appStore.get(playbackModeAtom);
    if (playbackMode != null) {
        const cutSegments = appStore.get(cutSegmentsAtom);
        const commandedTime = appStore.get(commandedTimeAtom);
        const selectedSegmentsWithoutMarkers = filterNonMarkers(appStore.get(selectedSegmentsAtom));
        const selectedSegmentAtCursor = selectedSegmentsWithoutMarkers.find((s) => s.segId === segmentAtCursor()?.segId);
        const isSomeSegmentAtCursor = selectedSegmentAtCursor != null && selectedSegmentAtCursor.end != null && selectedSegmentAtCursor.end - commandedTime > 0.1;
        if (!isSomeSegmentAtCursor) { // if a segment is already at cursor, don't do anything
            // if no segment at cursor, and looping playback mode, continue looping
            if (playbackMode === 'play-selected-segments' || playbackMode === 'loop-selected-segments') {
                const firstSelectedSegment = selectedSegmentsWithoutMarkers[0];
                if (firstSelectedSegment != null) {
                    const index = cutSegments.findIndex((segment) => segment.segId === firstSelectedSegment.segId);
                    if (index !== -1) appStore.set(currentSegIndexAtom, index);
                    seekAbs(firstSelectedSegment.start);
                }
            } else {
                const currentCutSeg = appStore.get(currentCutSegAtom);
                // for all other playback modes, seek to start of current segment
                if (currentCutSeg != null) seekAbs(currentCutSeg.start);
            }
        }
    }
    play(resetPlaybackRate);
}

const getNewJumpIndex = (oldIndex: number, direction: -1 | 1) => Math.max(oldIndex + direction, 0);

export function onTimeUpdate(currentTime: number) {
    if (appStore.get(playerTimeAtom) === currentTime) return;
    appStore.set(playerTimeAtom, currentTime);

    const playbackMode = appStore.get(playbackModeAtom);
    if (playbackMode == null || !appStore.get(playingAtom)) return;

    const cutSegments = appStore.get(cutSegmentsAtom);
    const playingSegment = segmentAtCursor();
    if (!playingSegment || playingSegment.end == null) return;

    const nextAction = getPlaybackAction({ playbackMode, currentTime, playingSegment: { start: playingSegment.start, end: playingSegment.end } });
    if (nextAction == null) return;

    const exit = () => {
        setPlaybackMode(undefined);
        pause();
    };

    if (nextAction.nextSegment) {
        const selectedSegmentsWithoutMarkers = filterNonMarkers(appStore.get(selectedSegmentsAtom));
        const index = selectedSegmentsWithoutMarkers.findIndex((s) => s.segId === playingSegment.segId);
        let newSelectedSegmentIndex = getNewJumpIndex(index !== -1 ? index : 0, 1);
        if (newSelectedSegmentIndex > selectedSegmentsWithoutMarkers.length - 1) {
            // have reached end of last segment
            if (playbackMode === 'loop-selected-segments') newSelectedSegmentIndex = 0; // start over
            else if (playbackMode === 'play-selected-segments') exit();
        }
        const nextSelectedSegment = selectedSegmentsWithoutMarkers[newSelectedSegmentIndex];
        if (nextSelectedSegment != null) {
            seekAbs(nextSelectedSegment.start);
            const newIndex = cutSegments.findIndex((segment) => segment.segId === nextSelectedSegment.segId);
            if (newIndex !== -1) appStore.set(currentSegIndexAtom, newIndex);
        }
    }
    if (nextAction.seekTo != null) seekAbs(nextAction.seekTo);
    if (nextAction.exit) exit();
}

export const togglePlaySelectedSegments = () => togglePlay({ resetPlaybackRate: false, requestPlaybackMode: 'play-selected-segments' });
export const toggleLoopSelectedSegments = () => togglePlay({ resetPlaybackRate: false, requestPlaybackMode: 'loop-selected-segments' });

export function shortStep(direction: number) {
    const video = getVideo();
    if (!video) return;
    // If we don't know fps, just assume 30 (for example if unknown audio file)
    const fps = appStore.get(detectedFpsAtom) || 30;
    // try to align with frame
    const currentTimeNearestFrameNumber = getFrameCountRaw(fps, video.currentTime);
    invariant(currentTimeNearestFrameNumber != null);
    seekAbs((currentTimeNearestFrameNumber + direction) / fps);
}

export function jumpSegStart(index: number) {
    const seg = appStore.get(cutSegmentsAtom)[index];
    if (seg != null) seekAbs(seg.start);
}

export function jumpSegEnd(index: number) {
    const seg = appStore.get(cutSegmentsAtom)[index];
    if (seg?.end != null) seekAbs(seg.end);
}

export const jumpCutStart = () => jumpSegStart(appStore.get(currentSegIndexSafeAtom));
export const jumpCutEnd = () => jumpSegEnd(appStore.get(currentSegIndexSafeAtom));
export const jumpTimelineStart = () => seekAbs(0);
export const jumpTimelineEnd = () => seekAbs(appStore.get(fileDurationAtom));

export function jumpSeg(params: ({ abs: number; } | { rel: -1 | 1; }) & { seek?: true; }) {
    const cutSegments = appStore.get(cutSegmentsAtom);
    const clamp = (v: number) => Math.max(0, Math.min(v, cutSegments.length - 1));
    const index = 'abs' in params ? clamp(params.abs) : clamp(getNewJumpIndex(appStore.get(currentSegIndexAtom), params.rel));
    appStore.set(currentSegIndexAtom, index);
    if (params.seek && cutSegments[index]) seekAbs(cutSegments[index].start);
}

export function userChangePlaybackRate(dir: number, rateMultiplier?: number) {
    const video = getVideo();
    if (!video) return;
    if (!appStore.get(playingAtom)) {
        play();
    } else {
        setPlaybackRate(adjustRate(video.playbackRate, dir, rateMultiplier));
    }
}

export function checkFileOpened() {
    if (appStore.get(isFileOpenedAtom)) return true;
    toast.fire({ icon: 'info', title: i18n.t('You need to open a media file first') });
    return false;
}

let previousPlaybackVolume = userSettings.playbackVolume;

export function toggleMuted() {
    const volume = userSettings.playbackVolume;
    if (volume === 0) {
        userSettings.playbackVolume = previousPlaybackVolume || 1;
    } else {
        previousPlaybackVolume = volume;
        userSettings.playbackVolume = 0;
    }
}

export function onActiveVideoStreamChange(videoStreamIndex?: number) {
    const video = getVideo();
    invariant(video);
    appStore.set(hideCompatPlayerAtom, false);
    enableVideoTrack(video, videoStreamIndex);
    appStore.set(activeVideoStreamIndexAtom, videoStreamIndex);
}

export function onActiveAudioStreamsChange(audioStreamIndexes: Set<number>) {
    const video = getVideo();
    invariant(video);
    appStore.set(hideCompatPlayerAtom, false);
    enableAudioTrack(video, [...audioStreamIndexes][0]);
    appStore.set(activeAudioStreamIndexesAtom, audioStreamIndexes);
}

export function handleHideCompatPlayerClick() {
    appStore.set(hideCompatPlayerAtom, true);
    appStore.set(previewFilePathAtom, undefined);
    appStore.set(usingDummyVideoAtom, false);
}
