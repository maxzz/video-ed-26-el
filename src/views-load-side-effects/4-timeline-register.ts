import { registerActions } from "@/editor/0-core/7-actions/kbd-actions";
import { userSettings } from "@/editor/0-core/9-state/user-settings";
import * as tl from "@/editor/4-timeline/7-actions/3-timeline-actions";
import { readAllKeyframes } from "@/editor/4-timeline/7-actions/1-init-keyframes";
import { generateOverviewWaveform } from "@/editor/4-timeline/7-actions/5-waveform";
import { initThumbnails } from "@/editor/4-timeline/7-actions/2-init-thumbnails";

const seekKeyup = tl.resetSeekAcceleration;

export function register_4_timeline() {
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
