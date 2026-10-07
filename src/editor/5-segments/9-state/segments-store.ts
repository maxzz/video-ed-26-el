import { atom } from "jotai";
import { snapshot, subscribe } from "valtio";
import { proxyWithHistory } from "valtio-history";
import { type DefiniteSegmentBase, type SegmentToExport, type StateSegment } from "@/editor/0-core/8-lib/9-types-core";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { userSettingsAtom } from "@/editor/0-core/9-state/user-settings";
import { onFileReset } from "@/editor/0-core/7-actions/2-lifecycle";
import { fileDurationAtom, fileDurationNonZeroAtom } from "@/editor/2-file/9-state/a-file-atoms";
import { filterNonMarkers, invertSegments, isDurationValid, sortSegments } from "../8-lib/segments";

const maxHistory = 100;

/**
 * Segments with undo/redo. Every change goes through setCutSegments() (see 7-actions), which
 * replaces the array and saves one history entry, so one user operation is one undo step.
 */
export const segmentsHistory = proxyWithHistory<{ segments: StateSegment[]; }>({ segments: [] }, { skipSubscribe: true });

/** Read-only mirror of the current segments for Jotai derived atoms and components */
export const cutSegmentsAtom = atom<readonly StateSegment[]>([]);
export const canUndoAtom = atom(false);
export const canRedoAtom = atom(false);

subscribe(segmentsHistory, () => {
    jotaiDefaultStore.set(cutSegmentsAtom, snapshot(segmentsHistory).value.segments as StateSegment[]);
    jotaiDefaultStore.set(canUndoAtom, segmentsHistory.isUndoEnabled);
    jotaiDefaultStore.set(canRedoAtom, segmentsHistory.isRedoEnabled);
});

export function getCutSegments() {
    return jotaiDefaultStore.get(cutSegmentsAtom) as StateSegment[];
}

export function commitSegments(segments: StateSegment[]) {
    segmentsHistory.value.segments = segments;
    segmentsHistory.saveHistory();
    while (segmentsHistory.historyNodeCount > maxHistory + 1) {
        segmentsHistory.remove(0);
    }
}

/** Forget all history, e.g. when closing a file */
export function resetSegmentsHistory() {
    segmentsHistory.value.segments = [];
    segmentsHistory.history.nodes = [{ createdAt: new Date(), snapshot: { segments: [] } }];
    segmentsHistory.history.index = 0;
}

onFileReset(resetSegmentsHistory);

export const undoSegments = () => segmentsHistory.undo();
export const redoSegments = () => segmentsHistory.redo();

// Other segment state

export const currentSegIndexAtom = atom(0);
export const segColorCounterAtom = atom(0);

// Derived

export const currentSegIndexSafeAtom = atom((get) => Math.min(get(currentSegIndexAtom), get(cutSegmentsAtom).length - 1));

export const currentCutSegAtom = atom((get) => get(cutSegmentsAtom)[get(currentSegIndexSafeAtom)]);

export const haveInvalidSegsAtom = atom((get) => get(cutSegmentsAtom).some((seg) => seg.end != null && seg.start >= seg.end));

export const currentCutSegOrWholeTimelineAtom = atom((get) => {
    const { start = 0, end = get(fileDurationNonZeroAtom) } = get(currentCutSegAtom) ?? {};
    return { start, end, duration: end - start };
});

export const selectedSegmentsAtom = atom((get) => get(cutSegmentsAtom).flatMap((segment, i) => (segment.selected ? [{ ...segment, originalIndex: i }] : [])));

export const inverseCutSegmentsAtom = atom((get) => {
    const fileDuration = get(fileDurationAtom);
    if (get(haveInvalidSegsAtom) || !isDurationValid(fileDuration)) return [];

    // exclude segments that don't have a length (markers)
    // also exclude initial segment (will cause problems later on)
    const sortedSegments = sortSegments(filterNonMarkers([...get(cutSegmentsAtom)]).filter((seg) => !seg.initial));

    return invertSegments(sortedSegments, true, true, fileDuration).flatMap(({ segId, end, name: _ignored, ...rest }) => (
        segId != null && end != null ? [{ segId, end, ...rest }] : []
    ));
});

export const segmentsOrInverseAtom = atom<{ selected: SegmentToExport[]; all: DefiniteSegmentBase[]; }>((get) => {
    const cutSegments = [...get(cutSegmentsAtom)];
    const inverseCutSegments = get(inverseCutSegmentsAtom);

    // For invertCutSegments we do not support filtering (selecting) segments
    if (get(userSettingsAtom).invertCutSegments) {
        return {
            selected: inverseCutSegments.map((seg, i) => ({ ...seg, originalIndex: i })),
            all: inverseCutSegments,
        };
    }

    const nonMarkers = filterNonMarkers(get(selectedSegmentsAtom));

    // If user has selected no segments, default to all instead.
    const selectedSegmentsWithFallback = nonMarkers.length > 0 ? nonMarkers : filterNonMarkers(cutSegments).map((seg, i) => ({ ...seg, originalIndex: i }));

    return {
        // exclude markers (segments without any end)
        // and exclude the initial segment, to prevent cutting when not really needed (if duration changes after the segment was created)
        selected: selectedSegmentsWithFallback.filter((seg) => !seg.initial),
        // `all` includes also all non selected segments:
        all: filterNonMarkers(cutSegments).filter((seg) => !seg.initial),
    };
});

export const segmentsToExportAtom = atom<SegmentToExport[]>((get) => {
    // 'segmentsToChaptersOnly' is a special mode where all segments will be simply written out as chapters to one file
    if (get(userSettingsAtom).segmentsToChaptersOnly) return [];
    return get(segmentsOrInverseAtom).selected;
});

export function findSegmentsAtCursor(cutSegments: readonly StateSegment[], currentTime: number) {
    return cutSegments.flatMap((segment, index) => (
        segment.start <= currentTime && segment.end != null && segment.end >= currentTime ? [index] : []
    )).reverse(); // reverse, so that if we are on multiple, we select the last first
}
