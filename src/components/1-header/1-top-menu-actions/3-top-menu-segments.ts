import { tmcmd_mutateSegmentsByExpr, tmcmd_selectSegmentsByExpr, tmcmd_shiftAllSegmentTimes } from "@/editor/5-segments/7-actions/segment-dialogs";
import {
    tmcmd_alignSegmentTimesToKeyframes, tmcmd_clearSegments, tmcmd_combineOverlappingSegments,
    tmcmd_combineSelectedSegments, tmcmd_createFixedByteSizedSegments, tmcmd_createFixedDurationSegments,
    tmcmd_createNumSegments, tmcmd_createRandomSegments, tmcmd_fillSegmentsGaps, tmcmd_invertAllSegments,
    tmcmd_reorderSegsByStartTime, tmcmd_shuffleSegments, tmcmd_splitCurrentSegment,
} from "@/editor/5-segments/7-actions/segment-actions";

export function createNumSegments() {
    return tmcmd_createNumSegments();
}

export function createFixedDurationSegments() {
    return tmcmd_createFixedDurationSegments();
}

export function createFixedByteSizedSegments() {
    return tmcmd_createFixedByteSizedSegments();
}

export function createRandomSegments() {
    return tmcmd_createRandomSegments();
}

export function reorderSegsByStartTime() {
    tmcmd_reorderSegsByStartTime();
}

export function shuffleSegments() {
    tmcmd_shuffleSegments();
}

export function combineOverlappingSegments() {
    tmcmd_combineOverlappingSegments();
}

export function combineSelectedSegments() {
    tmcmd_combineSelectedSegments();
}

export function splitCurrentSegment() {
    tmcmd_splitCurrentSegment();
}

export function invertAllSegments() {
    tmcmd_invertAllSegments();
}

export function fillSegmentsGaps() {
    tmcmd_fillSegmentsGaps();
}

export function shiftAllSegmentTimes() {
    return tmcmd_shiftAllSegmentTimes();
}

export function alignSegmentTimesToKeyframes() {
    return tmcmd_alignSegmentTimesToKeyframes();
}

export function selectSegmentsByExpr() {
    return tmcmd_selectSegmentsByExpr();
}

export function mutateSegmentsByExpr() {
    return tmcmd_mutateSegmentsByExpr();
}

export function clearSegments() {
    tmcmd_clearSegments();
}
