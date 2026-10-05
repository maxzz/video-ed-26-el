import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { userSettings } from '@/editor/0-core/9-state/user-settings.ts';
import * as tl from '@/editor/4-timeline/7-actions/timeline-actions.ts';
import { readAllKeyframes } from '@/editor/4-timeline/7-actions/keyframes.ts';
import { generateOverviewWaveform } from '@/editor/4-timeline/7-actions/waveform.ts';
import { initThumbnails } from '@/editor/4-timeline/7-actions/thumbnails.ts';

const seekKeyup = tl.resetSeekAcceleration;

function register() {
    initThumbnails();

    registerActions({
        timelineToggleComfortZoom: tl.timelineToggleComfortZoom,
        timelineZoomIn: () => tl.zoomRel(1),
        timelineZoomOut: () => tl.zoomRel(-1),
        increaseRotation: tl.increaseRotation,
        seekBackwards: { run: () => tl.seekRelAccelerated(-1 * userSettings.keyboardNormalSeekSpeed), keyup: seekKeyup },
        seekBackwards2: { run: () => tl.seekRelAccelerated(-1 * userSettings.keyboardSeekSpeed2), keyup: seekKeyup },
        seekBackwards3: { run: () => tl.seekRelAccelerated(-1 * userSettings.keyboardSeekSpeed3), keyup: seekKeyup },
        seekForwards: { run: () => tl.seekRelAccelerated(userSettings.keyboardNormalSeekSpeed), keyup: seekKeyup },
        seekForwards2: { run: () => tl.seekRelAccelerated(userSettings.keyboardSeekSpeed2), keyup: seekKeyup },
        seekForwards3: { run: () => tl.seekRelAccelerated(userSettings.keyboardSeekSpeed3), keyup: seekKeyup },
        seekBackwardsPercent: () => tl.seekRelPercent(-0.01),
        seekForwardsPercent: () => tl.seekRelPercent(0.01),
        seekBackwardsKeyframe: () => tl.seekClosestKeyframe(-1),
        seekForwardsKeyframe: () => tl.seekClosestKeyframe(1),
        readAllKeyframes,
        toggleWaveformMode: tl.toggleWaveformMode,
        toggleShowThumbnails: tl.toggleShowThumbnails,
        toggleShowKeyframes: tl.toggleShowKeyframes,
        generateOverviewWaveform,
    });
}

export { register as "4-timeline-register" };
