// Owner: 5-segments port. Public API of the segments feature.
import { registerActions } from '@/editor/0-core/7-actions/actions-registry.ts';
import { redoSegments, undoSegments } from './9-state/segments-store.ts';
import * as seg from './7-actions/segment-actions.ts';
import { editCurrentSegmentTags, mutateSegmentsByExpr, selectSegmentsByExpr, shiftAllSegmentTimes } from './7-actions/segment-dialogs.tsx';

export { SegmentList } from './0-ui/segment-list.tsx';
export { SegmentTagsDialog } from './0-ui/segment-tags-dialog.tsx';
export { editSegmentTags } from './7-actions/segment-dialogs.tsx';

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
