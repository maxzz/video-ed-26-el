import { toggleLastCommands as toggleLastCommandsImpl } from '@/editor/1-layout/9-state/panels-atoms.ts';
import { askStartTimeOffset } from '@/editor/2-file/7-actions/load-media.ts';
import { readAllKeyframes as readAllKeyframesImpl } from '@/editor/4-timeline/7-actions/keyframes.ts';
import { createSegmentsFromKeyframes as createSegmentsFromKeyframesImpl } from '@/editor/5-segments/7-actions/segment-actions.ts';
import { concatBatch as concatBatchImpl } from '@/editor/8-concat/7-actions/concat-actions.ts';
import { detectBlackScenes as detectBlackScenesImpl, detectSceneChanges as detectSceneChangesImpl, detectSilentScenes as detectSilentScenesImpl } from '@/editor/b-detect/7-actions/detect-actions.ts';

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
