// Owner: b-detect port. Public API of the segment detection feature.
// createSegmentsFromKeyframes is registered by 5-segments, readAllKeyframes by 4-timeline.
import { registerActions } from '@/editor/0-core/1-actions/actions-registry.ts';
import { detectBlackScenes, detectSceneChanges, detectSilentScenes } from './1-actions/detect-actions.ts';

export { detectBlackScenes, detectSceneChanges, detectSilentScenes };
export { showParametersDialog } from './3-ui/parameters-dialog.tsx';

registerActions({
    detectBlackScenes,
    detectSilentScenes,
    detectSceneChanges,
});
