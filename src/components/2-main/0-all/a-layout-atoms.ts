import { atom } from "jotai";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";

// Visibility of the main layout regions

/** Segment list on the right */
export const showRightBarAtom = atom(true);

export const toggleSegmentsList = () => jotaiDefaultStore.set(showRightBarAtom, (v) => !v);
