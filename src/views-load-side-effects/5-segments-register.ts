import { registerActions } from "@/editor/0-core/7-actions/kbd-actions";
import { tmcmd_edit_redoSegments, tmcmd_edit_undoSegments } from "@/editor/5-segments/9-state/a-segments-store";
import * as seg from "@/editor/5-segments/7-actions/segment-actions";
import { editCurrentSegmentTags, tmcmd_segments_mutateSegmentsByExpr, tmcmd_segments_selectSegmentsByExpr, tmcmd_segments_shiftAllSegmentTimes } from "@/editor/5-segments/7-actions/segment-dialogs";

export function register_5_segments() {
    registerActions({
        setCutStart: seg.setCutStart,
        setCutEnd: seg.setCutEnd,
        splitCurrentSegment: seg.tmcmd_segments_splitCurrentSegment,
        focusSegmentAtCursor: seg.focusSegmentAtCursor,
        selectSegmentsAtCursor: seg.selectSegmentsAtCursor,
        removeCurrentSegment: () => seg.removeSegment(seg.getCurrentSegIndexSafe(), true),
        removeCurrentCutpoint: () => seg.removeSegment(seg.getCurrentSegIndexSafe()),
        undo: tmcmd_edit_undoSegments,
        redo: tmcmd_edit_redoSegments,
        labelCurrentSegment: seg.labelCurrentSegment,
        addSegment: seg.addSegment,
        duplicateCurrentSegment: seg.duplicateCurrentSegment,
        reorderSegsByStartTime: seg.tmcmd_segments_reorderSegsByStartTime,
        invertAllSegments: seg.tmcmd_segments_invertAllSegments,
        fillSegmentsGaps: seg.tmcmd_segments_fillSegmentsGaps,
        combineOverlappingSegments: seg.tmcmd_segments_combineOverlappingSegments,
        combineSelectedSegments: seg.tmcmd_segments_combineSelectedSegments,
        createFixedDurationSegments: seg.tmcmd_segments_createFixedDurationSegments,
        createNumSegments: seg.tmcmd_segments_createNumSegments,
        createFixedByteSizedSegments: seg.tmcmd_segments_createFixedByteSizedSegments,
        createRandomSegments: seg.tmcmd_segments_createRandomSegments,
        alignSegmentTimesToKeyframes: seg.tmcmd_segments_alignSegmentTimesToKeyframes,
        shuffleSegments: seg.tmcmd_segments_shuffleSegments,
        clearSegments: seg.tmcmd_segments_clearSegments,
        deselectAllSegments: seg.deselectAllSegments,
        selectAllSegments: seg.selectAllSegments,
        selectOnlyCurrentSegment: seg.selectOnlyCurrentSegment,
        toggleCurrentSegmentSelected: seg.toggleCurrentSegmentSelected,
        invertSelectedSegments: seg.invertSelectedSegments,
        removeSelectedSegments: seg.removeSelectedSegments,
        createSegmentsFromKeyframes: seg.tmcmd_tools_createSegmentsFromKeyframes,
        selectAllMarkers: seg.selectAllMarkers,
        selectSegmentsByLabel: seg.selectSegmentsByLabel,
        labelSelectedSegments: seg.labelSelectedSegments,
        selectSegmentsByExpr: tmcmd_segments_selectSegmentsByExpr,
        mutateSegmentsByExpr: tmcmd_segments_mutateSegmentsByExpr,
        editCurrentSegmentTags,
        shiftAllSegmentTimes: tmcmd_segments_shiftAllSegmentTimes,
    });
}
