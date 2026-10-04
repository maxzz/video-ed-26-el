import { atom } from 'jotai';
import sortBy from 'lodash/sortBy.js';
import type { Frame } from '@/editor/0-core/8-lib/ffmpeg/ffmpeg.ts';
import type { OverviewWaveform, Thumbnail, WaveformSlice } from '@/editor/0-core/8-lib/types.ts';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { userSettingsAtom } from '@/editor/0-core/9-state/user-settings.ts';
import { getFrameCountAtom } from '@/editor/0-core/9-state/timecode.ts';
import { onFileReset } from '@/editor/0-core/7-actions/lifecycle.ts';
import { calcShouldShowKeyframes, calcShouldShowWaveform } from '@/editor/0-core/8-lib/util.ts';
import { getFrameCountRaw } from '@/editor/9-edl/8-lib/edl-formats.ts';
import { detectedFpsAtom, fileDurationAtom, hasAudioAtom, hasVideoAtom, isFileOpenedAtom, startTimeOffsetAtom } from '@/editor/2-file/9-state/file-atoms.ts';
import { activeAudioStreamsAtom, commandedTimeAtom, playingAtom, relevantTimeAtom } from '@/editor/3-player/9-state/player-atoms.ts';
import { hoveringTimeAtom } from '@/editor/1-layout/9-state/panels-atoms.ts';
import { isDurationValid } from '@/editor/5-segments/8-lib/segments.ts';

// Zoom

/** Unrounded so that wheel zoom can accumulate small steps */
export const zoomUnroundedAtom = atom(1);
export const zoomAtom = atom((get) => Math.floor(get(zoomUnroundedAtom)));
export const isZoomedAtom = atom((get) => get(zoomAtom) > 1);
export const zoomWindowStartTimeAtom = atom(0);

export const zoomedDurationAtom = atom((get) => {
    const fileDuration = get(fileDurationAtom);
    return isDurationValid(fileDuration) ? fileDuration / get(zoomAtom) : undefined;
});

export const zoomWindowEndTimeAtom = atom((get) => {
    const zoomedDuration = get(zoomedDurationAtom);
    return zoomedDuration != null ? get(zoomWindowStartTimeAtom) + zoomedDuration : undefined;
});

export const comfortZoomAtom = atom((get) => {
    const fileDuration = get(fileDurationAtom);
    return isDurationValid(fileDuration) ? Math.max(fileDuration / 100, 1) : undefined;
});

// Waveform / thumbnails / keyframes modes

export const forceBigWaveformAtom = atom((get) => !get(hasVideoAtom) && get(hasAudioAtom));
export const waveformModeAtom = atom((get) => (get(forceBigWaveformAtom) ? 'big-waveform' as const : get(userSettingsAtom).waveformMode));
export const waveformEnabledAtom = atom((get) => get(hasAudioAtom) && get(waveformModeAtom) != null);
export const bigWaveformEnabledAtom = atom((get) => get(waveformEnabledAtom) && get(waveformModeAtom) === 'big-waveform');
export const showThumbnailsAtom = atom((get) => get(userSettingsAtom).thumbnailsEnabled && get(hasVideoAtom));
export const keyframesEnabledAtom = atom((get) => get(userSettingsAtom).keyframesEnabled);
export const shouldShowKeyframesAtom = atom((get) => get(keyframesEnabledAtom) && get(hasVideoAtom) && calcShouldShowKeyframes(get(zoomedDurationAtom)));

// Waveforms (port of upstream useWaveform)

export const waveformsAtom = atom<WaveformSlice[]>([]);
export const overviewWaveformAtom = atom<OverviewWaveform | undefined>(undefined);
export const waveformAudioStreamAtom = atom((get) => get(activeAudioStreamsAtom)[0]);
export const shouldShowWaveformAtom = atom((get) => calcShouldShowWaveform(get(zoomedDurationAtom)) || get(overviewWaveformAtom) != null);

// Thumbnails (port of upstream useThumbnails)

export const thumbnailsAtom = atom<Thumbnail[]>([]);
export const thumbnailsSortedAtom = atom((get) => sortBy(get(thumbnailsAtom), (thumbnail) => thumbnail.time));

// Keyframes (port of upstream useKeyframes)

export const neighbouringKeyFramesMapAtom = atom<Record<string, Frame>>({});
export const neighbouringKeyFramesAtom = atom((get) => Object.values(get(neighbouringKeyFramesMapAtom)));
export const maxKeyframesAtom = atom(10000);

export const keyframeByNumberAtom = atom((get) => {
    const detectedFps = get(detectedFpsAtom);
    const map: Record<number, Frame> = {};
    if (detectedFps != null) {
        for (const frame of get(neighbouringKeyFramesAtom)) {
            map[getFrameCountRaw(detectedFps, frame.time)!] = frame;
        }
    }
    return map;
});

/** Keyframe at the commanded time, if any */
export const currentFrameAtom = atom((get) => {
    const frameNum = get(getFrameCountAtom)(get(commandedTimeAtom));
    if (frameNum == null) return undefined;
    return get(keyframeByNumberAtom)[frameNum];
});

export const keyFramesInZoomWindowAtom = atom((get) => {
    const zoomWindowEndTime = get(zoomWindowEndTimeAtom);
    const zoomWindowStartTime = get(zoomWindowStartTimeAtom);
    if (zoomWindowEndTime == null) return [];
    return get(neighbouringKeyFramesAtom).filter((f) => f.time >= zoomWindowStartTime && f.time <= zoomWindowEndTime);
});

// Seek

/** Keyboard seek acceleration, reset on key up (upstream seekAccelerationRef) */
export const seekAccelerationAtom = atom(1);

/** Time shown in the bottom bar. High frequency: read only in a leaf component */
export const displayTimeAtom = atom((get) => {
    const hoveringTime = get(hoveringTimeAtom);
    const time = hoveringTime != null && get(isFileOpenedAtom) && !get(playingAtom) ? hoveringTime : get(relevantTimeAtom);
    return time + get(startTimeOffsetAtom);
});

// DOM elements, set by ref callbacks

export const timelineScrollerElementAtom = atom<HTMLDivElement | null>(null);
export const timelineWrapperElementAtom = atom<HTMLDivElement | null>(null);

onFileReset(() => {
    appStore.set(zoomUnroundedAtom, 1);
    appStore.set(zoomWindowStartTimeAtom, 0);
    appStore.set(seekAccelerationAtom, 1);
});
