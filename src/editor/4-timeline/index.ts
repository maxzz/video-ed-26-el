// Owner: 4-timeline port. Public API of the timeline feature.
import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { userSettings } from '@/editor/0-core/9-state/user-settings.ts';
import * as tl from './7-actions/timeline-actions.ts';
import { readAllKeyframes } from './7-actions/keyframes.ts';
import { generateOverviewWaveform } from './7-actions/waveform.ts';
import './7-actions/thumbnails.ts';

export { Timeline } from './0-ui/0-all/0-timeline-all.tsx';
export { TimelineHosts } from './0-ui/timeline-hosts.tsx';
export { BigWaveform } from './0-ui/big-waveform.tsx';
export { bigWaveformEnabledAtom, zoomAtom, zoomedDurationAtom, zoomWindowStartTimeAtom, zoomWindowEndTimeAtom, neighbouringKeyFramesAtom } from './9-state/timeline-atoms.ts';
export { areWeCuttingAtom } from './9-state/bottom-bar-atoms.ts';
export { findNearestKeyFrameTime } from './7-actions/timeline-actions.ts';
export { getModifierKeyNames, getModifier, keyMap } from './8-lib/modifier-keys.ts';

const seekKeyup = tl.resetSeekAcceleration;

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
