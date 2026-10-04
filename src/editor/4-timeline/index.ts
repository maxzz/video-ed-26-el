// Owner: 4-timeline port. Public API of the timeline feature.
import { registerActions } from '@/editor/0-core/1-actions/actions-registry.ts';
import { userSettings } from '@/editor/0-core/0-state/user-settings.ts';
import * as tl from './1-actions/timeline-actions.ts';
import { readAllKeyframes } from './1-actions/keyframes.ts';
import { generateOverviewWaveform } from './1-actions/waveform.ts';
import './1-actions/thumbnails.ts';

export { Timeline } from './3-ui/timeline.tsx';
export { TimelineHosts } from './3-ui/timeline-hosts.tsx';
export { BigWaveform } from './3-ui/big-waveform.tsx';
export { bigWaveformEnabledAtom, zoomAtom, zoomedDurationAtom, zoomWindowStartTimeAtom, zoomWindowEndTimeAtom, neighbouringKeyFramesAtom } from './0-state/timeline-atoms.ts';
export { areWeCuttingAtom } from './0-state/bottom-bar-atoms.ts';
export { findNearestKeyFrameTime } from './1-actions/timeline-actions.ts';
export { getModifierKeyNames, getModifier, keyMap } from './2-lib/modifier-keys.ts';

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
