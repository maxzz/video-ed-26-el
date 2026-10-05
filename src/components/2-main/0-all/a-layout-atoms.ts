import { atom } from 'jotai';
import { appStore } from '@/components/4-dialogs/7-0-dialogs/store';

// Visibility of the main layout regions

/** Segment list on the right */
export const showRightBarAtom = atom(true);

export const toggleSegmentsList = () => appStore.set(showRightBarAtom, (v) => !v);
