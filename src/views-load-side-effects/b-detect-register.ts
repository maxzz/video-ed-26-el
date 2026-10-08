import { registerActions } from "@/editor/0-core/7-actions/kbd-actions";
import { dialog_DetectBlackScenes, dialog_DetectSceneChanges, dialog_DetectSilentScenes } from "@/editor/b-detect/1-detect-actions";

export function register_b_detect() {
    registerActions({
        detectBlackScenes: dialog_DetectBlackScenes,
        detectSilentScenes: dialog_DetectSilentScenes,
        detectSceneChanges: dialog_DetectSceneChanges,
    });
}
