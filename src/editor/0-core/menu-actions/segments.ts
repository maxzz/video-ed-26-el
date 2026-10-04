import { mutateSegmentsByExpr as mutateSegmentsByExprImpl, selectSegmentsByExpr as selectSegmentsByExprImpl, shiftAllSegmentTimes as shiftAllSegmentTimesImpl } from '@/editor/5-segments/7-actions/segment-dialogs.tsx';
import {
    alignSegmentTimesToKeyframes as alignSegmentTimesToKeyframesImpl, clearSegments as clearSegmentsImpl, combineOverlappingSegments as combineOverlappingSegmentsImpl,
    combineSelectedSegments as combineSelectedSegmentsImpl, createFixedByteSizedSegments as createFixedByteSizedSegmentsImpl, createFixedDurationSegments as createFixedDurationSegmentsImpl,
    createNumSegments as createNumSegmentsImpl, createRandomSegments as createRandomSegmentsImpl, fillSegmentsGaps as fillSegmentsGapsImpl, invertAllSegments as invertAllSegmentsImpl,
    reorderSegsByStartTime as reorderSegsByStartTimeImpl, shuffleSegments as shuffleSegmentsImpl, splitCurrentSegment as splitCurrentSegmentImpl,
} from '@/editor/5-segments/7-actions/segment-actions.ts';

export function createNumSegments() {
    return createNumSegmentsImpl();
}

export function createFixedDurationSegments() {
    return createFixedDurationSegmentsImpl();
}

export function createFixedByteSizedSegments() {
    return createFixedByteSizedSegmentsImpl();
}

export function createRandomSegments() {
    return createRandomSegmentsImpl();
}

export function reorderSegsByStartTime() {
    reorderSegsByStartTimeImpl();
}

export function shuffleSegments() {
    shuffleSegmentsImpl();
}

export function combineOverlappingSegments() {
    combineOverlappingSegmentsImpl();
}

export function combineSelectedSegments() {
    combineSelectedSegmentsImpl();
}

export function splitCurrentSegment() {
    splitCurrentSegmentImpl();
}

export function invertAllSegments() {
    invertAllSegmentsImpl();
}

export function fillSegmentsGaps() {
    fillSegmentsGapsImpl();
}

export function shiftAllSegmentTimes() {
    return shiftAllSegmentTimesImpl();
}

export function alignSegmentTimesToKeyframes() {
    return alignSegmentTimesToKeyframesImpl();
}

export function selectSegmentsByExpr() {
    return selectSegmentsByExprImpl();
}

export function mutateSegmentsByExpr() {
    return mutateSegmentsByExprImpl();
}

export function clearSegments() {
    clearSegmentsImpl();
}
