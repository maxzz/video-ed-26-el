import type { WheelEvent } from 'react';
import i18n from 'i18next';
import { jotaiDefaultStore } from '@/utils/local-utils/9-jotai-default-store.ts';
import { userSettings } from '@/editor/0-core/9-state/user-settings.ts';
import { showNotification } from '@/editor/0-core/8-lib/notifications.ts';
import { zoomMax } from '@/editor/0-core/8-lib/constants.ts';
import { calcShouldShowKeyframes } from '@/editor/0-core/8-lib/util.ts';
import { isMatroska } from '@/editor/0-core/8-lib/ffmpeg/streams.ts';
import { findNearestKeyFrameTime as ffmpegFindNearestKeyFrameTime } from '@/editor/0-core/8-lib/ffmpeg/ffmpeg.ts';
import normalizeWheel from '@/editor/0-core/8-lib/normalize-wheel.ts';
import { detectedFpsAtom, fileFormatAtom, rotationAtom } from '@/editor/2-file/9-state/a-file-atoms.ts';
import { hideCompatPlayerAtom } from '@/editor/3-player/9-state/player-atoms.ts';
import { getRelevantTime, seekAbs, seekRel, shortStep } from '@/editor/3-player/7-actions/player-actions.ts';
import { isDurationValid } from '@/editor/5-segments/8-lib/segments.ts';
import { isModifierPressed } from '../8-lib/modifier-keys.ts';
import { comfortZoomAtom, forceBigWaveformAtom, neighbouringKeyFramesAtom, seekAccelerationAtom, zoomedDurationAtom, zoomUnroundedAtom } from '../9-state/timeline-atoms.ts';

export { showNotification };

// Zoom

export function zoomAbs(fn: (zoom: number) => number) {
    jotaiDefaultStore.set(zoomUnroundedAtom, (z) => Math.min(Math.max(fn(z), 1), zoomMax));
}

export const zoomRel = (rel: number) => zoomAbs((z) => z + (rel * (1 + (z / 10))));

export function timelineToggleComfortZoom() {
    const comfortZoom = jotaiDefaultStore.get(comfortZoomAtom);
    if (!comfortZoom) return;
    zoomAbs((prevZoom) => (prevZoom === 1 ? comfortZoom : 1));
}

// Seek

export function seekRelAccelerated(amount: number) {
    const acceleration = jotaiDefaultStore.get(seekAccelerationAtom);
    seekRel(acceleration * amount);
    jotaiDefaultStore.set(seekAccelerationAtom, acceleration * userSettings.keyboardSeekAccFactor);
}

export const resetSeekAcceleration = () => jotaiDefaultStore.set(seekAccelerationAtom, 1);

export function seekRelPercent(val: number) {
    const zoomedDuration = jotaiDefaultStore.get(zoomedDurationAtom);
    if (!isDurationValid(zoomedDuration)) return;
    seekRel(val * zoomedDuration);
}

export function findNearestKeyFrameTime({ time, direction }: { time: number; direction: number; }) {
    return ffmpegFindNearestKeyFrameTime({ frames: jotaiDefaultStore.get(neighbouringKeyFramesAtom), time, direction });
}

export function seekClosestKeyframe(direction: number) {
    const detectedFps = jotaiDefaultStore.get(detectedFpsAtom);
    const sigma = detectedFps ? (1 / detectedFps) : 0.1; // because we don't want it to find the keyframe we're currently at.
    const time = findNearestKeyFrameTime({ time: getRelevantTime() + direction * sigma, direction });
    if (time == null) return;
    seekAbs(time);
}

/** Wheel over the timeline: zoom, frame/keyframe step or seek depending on the modifier keys from settings */
export function onTimelineWheel(wheelEvent: WheelEvent<Element>) {
    const { wheelSensitivity, mouseWheelZoomModifierKey, mouseWheelFrameSeekModifierKey, mouseWheelKeyframeSeekModifierKey, invertTimelineScroll } = userSettings;
    const { pixelX, pixelY } = normalizeWheel(wheelEvent);

    const direction = invertTimelineScroll ? 1 : -1;
    const makeUnit = (v: number) => ((direction * v) > 0 ? 1 : -1);

    if (isModifierPressed(wheelEvent, mouseWheelZoomModifierKey)) {
        // see discussion https://github.com/mifi/lossless-cut/issues/2703
        zoomRel(pixelY * wheelSensitivity * 0.4);
    } else if (isModifierPressed(wheelEvent, mouseWheelFrameSeekModifierKey)) {
        shortStep(makeUnit(pixelX + pixelY));
    } else if (isModifierPressed(wheelEvent, mouseWheelKeyframeSeekModifierKey)) {
        seekClosestKeyframe(makeUnit(pixelX + pixelY));
    } else {
        seekRel(direction * (pixelX + pixelY) * wheelSensitivity * 0.2);
    }
}

// Rotation

export function increaseRotation() {
    jotaiDefaultStore.set(rotationAtom, (r) => (r + 90) % 450);
    jotaiDefaultStore.set(hideCompatPlayerAtom, false);
    // Matroska is known not to work, so we warn user. See https://github.com/mifi/lossless-cut/discussions/661
    if (isMatroska(jotaiDefaultStore.get(fileFormatAtom))) {
        showNotification({ text: i18n.t('Lossless rotation might not work with this file format. You may try changing to MP4') });
    }
}

// Timeline display toggles

export function toggleWaveformMode() {
    if (jotaiDefaultStore.get(forceBigWaveformAtom)) return;
    const { waveformMode } = userSettings;
    if (waveformMode === 'waveform') {
        userSettings.waveformMode = 'big-waveform';
    } else if (waveformMode === 'big-waveform') {
        userSettings.waveformMode = undefined;
    } else {
        showNotification({ text: i18n.t('Mini-waveform has been enabled. Click again to enable full-screen waveform') });
        userSettings.waveformMode = 'waveform';
    }
}

export function toggleShowThumbnails() {
    userSettings.thumbnailsEnabled = !userSettings.thumbnailsEnabled;
}

export function toggleShowKeyframes() {
    const enabled = !userSettings.keyframesEnabled;
    if (enabled && !calcShouldShowKeyframes(jotaiDefaultStore.get(zoomedDurationAtom))) {
        showNotification({ text: i18n.t('Key frames will show on the timeline. You need to zoom in to view them') });
    }
    userSettings.keyframesEnabled = enabled;
}

export { toggleInvertCutSegments, toggleSimpleMode, toggleExportConfirmEnabled } from '@/editor/0-core/7-actions/settings-toggles.ts';
