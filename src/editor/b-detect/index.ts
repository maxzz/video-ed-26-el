// Owner: b-detect port. Public API of the segment detection feature.
// createSegmentsFromKeyframes is registered by 5-segments, readAllKeyframes by 4-timeline.
import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { detectBlackScenes, detectSceneChanges, detectSilentScenes } from './7-actions/detect-actions.ts';

export { detectBlackScenes, detectSceneChanges, detectSilentScenes };
export { showParametersDialog } from './0-ui/parameters-dialog.tsx';

function register() {
    registerActions({
        detectBlackScenes,
        detectSilentScenes,
        detectSceneChanges,
    });
}

export { register as "b-detect-register" };
