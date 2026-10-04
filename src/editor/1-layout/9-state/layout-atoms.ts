import { atom } from 'jotai';
import { appStore } from '@/editor/0-core/9-state/store.ts';

// Visibility of the main layout regions

/** Segment list on the right */
export const showRightBarAtom = atom(true);

export const toggleSegmentsList = () => appStore.set(showRightBarAtom, (v) => !v);
