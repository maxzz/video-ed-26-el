import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { redoSegments, undoSegments } from '@/editor/5-segments/9-state/segments-store.ts';
import * as seg from '@/editor/5-segments/7-actions/segment-actions.ts';
import { editCurrentSegmentTags, mutateSegmentsByExpr, selectSegmentsByExpr, shiftAllSegmentTimes } from '@/editor/5-segments/7-actions/segment-dialogs.tsx';

function register() {
    registerActions({
        setCutStart: seg.setCutStart,
        setCutEnd: seg.setCutEnd,
        splitCurrentSegment: seg.splitCurrentSegment,
        focusSegmentAtCursor: seg.focusSegmentAtCursor,
        selectSegmentsAtCursor: seg.selectSegmentsAtCursor,
        removeCurrentSegment: () => seg.removeSegment(seg.getCurrentSegIndexSafe(), true),
        removeCurrentCutpoint: () => seg.removeSegment(seg.getCurrentSegIndexSafe()),
        undo: undoSegments,
        redo: redoSegments,
        labelCurrentSegment: seg.labelCurrentSegment,
        addSegment: seg.addSegment,
        duplicateCurrentSegment: seg.duplicateCurrentSegment,
        reorderSegsByStartTime: seg.reorderSegsByStartTime,
        invertAllSegments: seg.invertAllSegments,
        fillSegmentsGaps: seg.fillSegmentsGaps,
        combineOverlappingSegments: seg.combineOverlappingSegments,
        combineSelectedSegments: seg.combineSelectedSegments,
        createFixedDurationSegments: seg.createFixedDurationSegments,
        createNumSegments: seg.createNumSegments,
        createFixedByteSizedSegments: seg.createFixedByteSizedSegments,
        createRandomSegments: seg.createRandomSegments,
        alignSegmentTimesToKeyframes: seg.alignSegmentTimesToKeyframes,
        shuffleSegments: seg.shuffleSegments,
        clearSegments: seg.clearSegments,
        deselectAllSegments: seg.deselectAllSegments,
        selectAllSegments: seg.selectAllSegments,
        selectOnlyCurrentSegment: seg.selectOnlyCurrentSegment,
        toggleCurrentSegmentSelected: seg.toggleCurrentSegmentSelected,
        invertSelectedSegments: seg.invertSelectedSegments,
        removeSelectedSegments: seg.removeSelectedSegments,
        createSegmentsFromKeyframes: seg.createSegmentsFromKeyframes,
        selectAllMarkers: seg.selectAllMarkers,
        selectSegmentsByLabel: seg.selectSegmentsByLabel,
        labelSelectedSegments: seg.labelSelectedSegments,
        selectSegmentsByExpr,
        mutateSegmentsByExpr,
        editCurrentSegmentTags,
        shiftAllSegmentTimes,
    });
}

export { register as "5-segments-register" };
