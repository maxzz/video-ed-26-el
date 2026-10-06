import { arrayMove } from '@dnd-kit/sortable';
import { type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { jotaiDefaultStore } from '@/utils/local-utils/9-jotai-default-store';

import { batchFilesAtom } from '@/editor/2-file/9-state/a-file-atoms';
import { setBatchFiles } from '@/editor/2-file/index';
import { batchDraggingIdAtom, batchSortDescAtom } from '../9-state/concat-atoms';

// Port of the handlers of upstream components/BatchFilesList.tsx

export function sortBatchFiles() {
    const sortDesc = jotaiDefaultStore.get(batchSortDescAtom);
    const newSortDesc = sortDesc == null ? false : !sortDesc;
    const order = newSortDesc ? -1 : 1;
    // natural language sort (numeric) https://github.com/mifi/lossless-cut/issues/844
    setBatchFiles([...jotaiDefaultStore.get(batchFilesAtom)].sort((a, b) => order * a.name.localeCompare(b.name, 'en-US', { numeric: true })));
    jotaiDefaultStore.set(batchSortDescAtom, newSortDesc);
}

export function onBatchDragStart(event: DragStartEvent) {
    jotaiDefaultStore.set(batchDraggingIdAtom, event.active.id);
}

export function onBatchDragEnd({ active, over }: DragEndEvent) {
    jotaiDefaultStore.set(batchDraggingIdAtom, undefined);
    if (over == null || active.id === over.id) return;
    const batchFiles = jotaiDefaultStore.get(batchFilesAtom);
    const ids = batchFiles.map((f) => f.path);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    setBatchFiles(arrayMove(batchFiles, oldIndex, newIndex));
}

export function onBatchDragCancel() {
    jotaiDefaultStore.set(batchDraggingIdAtom, undefined);
}
