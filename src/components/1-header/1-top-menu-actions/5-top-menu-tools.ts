import { tmcmd_toggleLastCommands } from "@/components/2-main/0-all/a-panels-atoms";
import { tmcmd_askStartTimeOffset } from "@/editor/2-file/7-actions/load-media";
import { tmcmd_readAllKeyframes } from "@/editor/4-timeline/7-actions/1-init-keyframes";
import { tmcmd_createSegmentsFromKeyframes } from "@/editor/5-segments/7-actions/segment-actions";
import { tmcmd_concatBatch } from "@/editor/8-concat/7-actions/concat-actions";
import { tmcmd_dialog_DetectBlackScenes, tmcmd_dialog_DetectSceneChanges, tmcmd_dialog_DetectSilentScenes } from "@/editor/b-detect/1-detect-actions";

export function concatBatch() {
    tmcmd_concatBatch();
}

export function setStartTimeOffset() {
    return tmcmd_askStartTimeOffset();
}

export function detectBlackScenes() {
    return tmcmd_dialog_DetectBlackScenes();
}

export function detectSilentScenes() {
    return tmcmd_dialog_DetectSilentScenes();
}

export function detectSceneChanges() {
    return tmcmd_dialog_DetectSceneChanges();
}

export function readAllKeyframes() {
    return tmcmd_readAllKeyframes();
}

export function createSegmentsFromKeyframes() {
    return tmcmd_createSegmentsFromKeyframes();
}

export function toggleLastCommands() {
    tmcmd_toggleLastCommands();
}
