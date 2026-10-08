import { toggleLastCommands as toggleLastCommandsImpl } from "@/components/2-main/0-all/a-panels-atoms";
import { askStartTimeOffset } from "@/editor/2-file/7-actions/load-media";
import { readAllKeyframes as readAllKeyframesImpl } from "@/editor/4-timeline/7-actions/1-init-keyframes";
import { createSegmentsFromKeyframes as createSegmentsFromKeyframesImpl } from "@/editor/5-segments/7-actions/segment-actions";
import { concatBatch as concatBatchImpl } from "@/editor/8-concat/7-actions/concat-actions";
import { dialog_DetectBlackScenes as detectBlackScenesImpl, dialog_DetectSceneChanges as detectSceneChangesImpl, dialog_DetectSilentScenes as detectSilentScenesImpl } from "@/editor/b-detect/7-actions/detect-actions";

export function concatBatch() {
    concatBatchImpl();
}

export function setStartTimeOffset() {
    return askStartTimeOffset();
}

export function detectBlackScenes() {
    return detectBlackScenesImpl();
}

export function detectSilentScenes() {
    return detectSilentScenesImpl();
}

export function detectSceneChanges() {
    return detectSceneChangesImpl();
}

export function readAllKeyframes() {
    return readAllKeyframesImpl();
}

export function createSegmentsFromKeyframes() {
    return createSegmentsFromKeyframesImpl();
}

export function toggleLastCommands() {
    toggleLastCommandsImpl();
}
