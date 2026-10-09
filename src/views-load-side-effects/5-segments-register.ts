import { registerActions } from "@/editor/0-core/7-actions/kbd-actions";
import { tmcmd_redoSegments, tmcmd_undoSegments } from "@/editor/5-segments/9-state/a-segments-store";
import * as seg from "@/editor/5-segments/7-actions/segment-actions";
import { editCurrentSegmentTags, tmcmd_mutateSegmentsByExpr, tmcmd_selectSegmentsByExpr, tmcmd_shiftAllSegmentTimes } from "@/editor/5-segments/7-actions/segment-dialogs";

export function register_5_segments() {
    registerActions({
        setCutStart: seg.setCutStart,
        setCutEnd: seg.setCutEnd,
        splitCurrentSegment: seg.tmcmd_splitCurrentSegment,
        focusSegmentAtCursor: seg.focusSegmentAtCursor,
        selectSegmentsAtCursor: seg.selectSegmentsAtCursor,
        removeCurrentSegment: () => seg.removeSegment(seg.getCurrentSegIndexSafe(), true),
        removeCurrentCutpoint: () => seg.removeSegment(seg.getCurrentSegIndexSafe()),
        undo: tmcmd_undoSegments,
        redo: tmcmd_redoSegments,
        labelCurrentSegment: seg.labelCurrentSegment,
        addSegment: seg.addSegment,
        duplicateCurrentSegment: seg.duplicateCurrentSegment,
        reorderSegsByStartTime: seg.tmcmd_reorderSegsByStartTime,
        invertAllSegments: seg.tmcmd_invertAllSegments,
        fillSegmentsGaps: seg.tmcmd_fillSegmentsGaps,
        combineOverlappingSegments: seg.tmcmd_combineOverlappingSegments,
        combineSelectedSegments: seg.tmcmd_combineSelectedSegments,
        createFixedDurationSegments: seg.tmcmd_createFixedDurationSegments,
        createNumSegments: seg.tmcmd_createNumSegments,
        createFixedByteSizedSegments: seg.tmcmd_createFixedByteSizedSegments,
        createRandomSegments: seg.tmcmd_createRandomSegments,
        alignSegmentTimesToKeyframes: seg.tmcmd_alignSegmentTimesToKeyframes,
        shuffleSegments: seg.tmcmd_shuffleSegments,
        clearSegments: seg.tmcmd_clearSegments,
        deselectAllSegments: seg.deselectAllSegments,
        selectAllSegments: seg.selectAllSegments,
        selectOnlyCurrentSegment: seg.selectOnlyCurrentSegment,
        toggleCurrentSegmentSelected: seg.toggleCurrentSegmentSelected,
        invertSelectedSegments: seg.invertSelectedSegments,
        removeSelectedSegments: seg.removeSelectedSegments,
        createSegmentsFromKeyframes: seg.tmcmd_createSegmentsFromKeyframes,
        selectAllMarkers: seg.selectAllMarkers,
        selectSegmentsByLabel: seg.selectSegmentsByLabel,
        labelSelectedSegments: seg.labelSelectedSegments,
        selectSegmentsByExpr: tmcmd_selectSegmentsByExpr,
        mutateSegmentsByExpr: tmcmd_mutateSegmentsByExpr,
        editCurrentSegmentTags,
        shiftAllSegmentTimes: tmcmd_shiftAllSegmentTimes,
    });
}
