import { registerActions } from "@/editor/0-core/7-actions/kbd-actions";
import { detectBlackScenes, detectSceneChanges, detectSilentScenes } from "@/editor/b-detect/7-actions/detect-actions";

export function register_b_detect() {
    registerActions({
        detectBlackScenes,
        detectSilentScenes,
        detectSceneChanges,
    });
}
