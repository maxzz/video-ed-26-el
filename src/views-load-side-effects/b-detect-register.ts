import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { detectBlackScenes, detectSceneChanges, detectSilentScenes } from '@/editor/b-detect/7-actions/detect-actions.ts';

function register() {
    registerActions({
        detectBlackScenes,
        detectSilentScenes,
        detectSceneChanges,
    });
}

export { register as "b-detect-register" };
