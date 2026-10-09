import { tmcmd_tools_toggleLastCommands } from "@/components/2-main/0-all/a-panels-atoms";
import { tmcmd_tools_askStartTimeOffset } from "@/editor/2-file/7-actions/load-media";
import { tmcmd_tools_readAllKeyframes } from "@/editor/4-timeline/7-actions/1-init-keyframes";
import { tmcmd_tools_createSegmentsFromKeyframes } from "@/editor/5-segments/7-actions/segment-actions";
import { tmcmd_tools_concatBatch } from "@/editor/8-concat/7-actions/concat-actions";
import { tmcmd_tools_dialog_DetectBlackScenes, tmcmd_tools_dialog_DetectSceneChanges, tmcmd_tools_dialog_DetectSilentScenes } from "@/editor/b-detect/1-detect-actions";

export function concatBatch() {
    tmcmd_tools_concatBatch();
}

export function setStartTimeOffset() {
    return tmcmd_tools_askStartTimeOffset();
}

export function detectBlackScenes() {
    return tmcmd_tools_dialog_DetectBlackScenes();
}

export function detectSilentScenes() {
    return tmcmd_tools_dialog_DetectSilentScenes();
}

export function detectSceneChanges() {
    return tmcmd_tools_dialog_DetectSceneChanges();
}

export function readAllKeyframes() {
    return tmcmd_tools_readAllKeyframes();
}

export function createSegmentsFromKeyframes() {
    return tmcmd_tools_createSegmentsFromKeyframes();
}

export function toggleLastCommands() {
    tmcmd_tools_toggleLastCommands();
}
