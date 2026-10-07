import { atom } from "jotai";
import { type ColorInstance } from "color";
import { type Transition } from "motion/react";
import { type InverseCutSegment, type SegmentColorIndex, type StateSegment } from "@/editor/0-core/8-lib/9-types-core";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { prefersReducedMotionAtom, userSettingsAtom } from "@/editor/0-core/9-state/user-settings";
import { onFileReset } from "@/editor/0-core/7-actions/2-lifecycle";
import { getSegColor } from "@/editor/0-core/8-lib/colors";
import { commandedTimeAtom } from "@/editor/3-player/9-state/a-player-atoms";
import { isInitialSegment } from "../8-lib/segments";
import { cutSegmentsAtom, findSegmentsAtCursor, inverseCutSegmentsAtom, segColorCounterAtom, selectedSegmentsAtom } from "./segments-store";

// UI state shared by the timeline, the bottom bar and the segment list (upstream SegColorsContext + parts of useUserSettings)

const mySpring = { type: 'spring' as const, damping: 50, stiffness: 700 };

export const darkModeAtom = atom((get) => get(userSettingsAtom).darkMode);
export const simpleModeAtom = atom((get) => get(userSettingsAtom).simpleMode);
export const invertCutSegmentsAtom = atom((get) => get(userSettingsAtom).invertCutSegments);

export const springAnimationAtom = atom<Transition>((get) => (get(prefersReducedMotionAtom) ? { duration: 0 } : mySpring));

export const getSegColorAtom = atom((get) => {
    const { preferStrongColors } = get(userSettingsAtom);
    return (seg: SegmentColorIndex | undefined): ColorInstance => {
        const color = getSegColor(seg);
        return preferStrongColors ? color.desaturate(0.2) : color.desaturate(0.6);
    };
});

export const nextSegColorIndexAtom = atom((get) => {
    const counter = get(segColorCounterAtom);
    return isInitialSegment(get(cutSegmentsAtom) as StateSegment[]) ? counter : counter + 1;
});

/** Segments under the commanded time (not the high frequency player time) */
export const segmentsAtCursorAtom = atom((get) => {
    const cutSegments = get(cutSegmentsAtom);
    return findSegmentsAtCursor(cutSegments, get(commandedTimeAtom)).flatMap((index) => (cutSegments[index] ? [cutSegments[index]] : []));
});

export const firstSegmentAtCursorAtom = atom((get) => get(segmentsAtCursorAtom)[0]);

/** Rows of the segment list: the segments, or the gaps between them in "invert segments" mode */
export const segmentListItemsAtom = atom<readonly (StateSegment | InverseCutSegment)[]>((get) => (
    get(invertCutSegmentsAtom) ? get(inverseCutSegmentsAtom) : get(cutSegmentsAtom)
));

export const isOnlyMarkersAtom = atom((get) => {
    const items = get(segmentListItemsAtom);
    return items.length > 0 && items.every((seg) => seg.end == null);
});

export const selectedSegmentsTotalAtom = atom((get) => get(selectedSegmentsAtom).reduce((acc, seg) => (seg.end == null ? 0 : seg.end - seg.start) + acc, 0));

/** Segment list drag and drop: id of the segment being dragged */
export const draggingSegIdAtom = atom<string | undefined>(undefined);

onFileReset(() => {
    jotaiDefaultStore.set(draggingSegIdAtom, undefined);
});
