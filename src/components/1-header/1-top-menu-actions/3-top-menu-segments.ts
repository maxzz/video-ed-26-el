import { tmcmd_segments_mutateSegmentsByExpr, tmcmd_segments_selectSegmentsByExpr, tmcmd_segments_shiftAllSegmentTimes } from "@/editor/5-segments/7-actions/segment-dialogs";
import {
    tmcmd_segments_alignSegmentTimesToKeyframes, tmcmd_segments_clearSegments, tmcmd_segments_combineOverlappingSegments,
    tmcmd_segments_combineSelectedSegments, tmcmd_segments_createFixedByteSizedSegments, tmcmd_segments_createFixedDurationSegments,
    tmcmd_segments_createNumSegments, tmcmd_segments_createRandomSegments, tmcmd_segments_fillSegmentsGaps, tmcmd_segments_invertAllSegments,
    tmcmd_segments_reorderSegsByStartTime, tmcmd_segments_shuffleSegments, tmcmd_segments_splitCurrentSegment,
} from "@/editor/5-segments/7-actions/segment-actions";

export function createNumSegments() {
    return tmcmd_segments_createNumSegments();
}

export function createFixedDurationSegments() {
    return tmcmd_segments_createFixedDurationSegments();
}

export function createFixedByteSizedSegments() {
    return tmcmd_segments_createFixedByteSizedSegments();
}

export function createRandomSegments() {
    return tmcmd_segments_createRandomSegments();
}

export function reorderSegsByStartTime() {
    tmcmd_segments_reorderSegsByStartTime();
}

export function shuffleSegments() {
    tmcmd_segments_shuffleSegments();
}

export function combineOverlappingSegments() {
    tmcmd_segments_combineOverlappingSegments();
}

export function combineSelectedSegments() {
    tmcmd_segments_combineSelectedSegments();
}

export function splitCurrentSegment() {
    tmcmd_segments_splitCurrentSegment();
}

export function invertAllSegments() {
    tmcmd_segments_invertAllSegments();
}

export function fillSegmentsGaps() {
    tmcmd_segments_fillSegmentsGaps();
}

export function shiftAllSegmentTimes() {
    return tmcmd_segments_shiftAllSegmentTimes();
}

export function alignSegmentTimesToKeyframes() {
    return tmcmd_segments_alignSegmentTimesToKeyframes();
}

export function selectSegmentsByExpr() {
    return tmcmd_segments_selectSegmentsByExpr();
}

export function mutateSegmentsByExpr() {
    return tmcmd_segments_mutateSegmentsByExpr();
}

export function clearSegments() {
    tmcmd_segments_clearSegments();
}
