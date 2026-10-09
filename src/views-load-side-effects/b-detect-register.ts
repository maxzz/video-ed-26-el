import { registerActions } from "@/editor/0-core/7-actions/kbd-actions";
import { tmcmd_tools_dialog_DetectBlackScenes, tmcmd_tools_dialog_DetectSceneChanges, tmcmd_tools_dialog_DetectSilentScenes } from "@/editor/b-detect/1-detect-actions";

export function register_b_detect() {
    registerActions({
        detectBlackScenes: tmcmd_tools_dialog_DetectBlackScenes,
        detectSilentScenes: tmcmd_tools_dialog_DetectSilentScenes,
        detectSceneChanges: tmcmd_tools_dialog_DetectSceneChanges,
    });
}
