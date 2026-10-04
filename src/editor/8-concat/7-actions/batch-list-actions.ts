import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { appStore } from '@/editor/0-core/0-state/store.ts';
import { batchFilesAtom } from '@/editor/2-file/0-state/file-atoms.ts';
import { setBatchFiles } from '@/editor/2-file/index.ts';
import { batchDraggingIdAtom, batchSortDescAtom } from '../0-state/concat-atoms.ts';

// Port of the handlers of upstream components/BatchFilesList.tsx

export function sortBatchFiles() {
    const sortDesc = appStore.get(batchSortDescAtom);
    const newSortDesc = sortDesc == null ? false : !sortDesc;
    const order = newSortDesc ? -1 : 1;
    // natural language sort (numeric) https://github.com/mifi/lossless-cut/issues/844
    setBatchFiles([...appStore.get(batchFilesAtom)].sort((a, b) => order * a.name.localeCompare(b.name, 'en-US', { numeric: true })));
    appStore.set(batchSortDescAtom, newSortDesc);
}

export function onBatchDragStart(event: DragStartEvent) {
    appStore.set(batchDraggingIdAtom, event.active.id);
}

export function onBatchDragEnd({ active, over }: DragEndEvent) {
    appStore.set(batchDraggingIdAtom, undefined);
    if (over == null || active.id === over.id) return;
    const batchFiles = appStore.get(batchFilesAtom);
    const ids = batchFiles.map((f) => f.path);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    setBatchFiles(arrayMove(batchFiles, oldIndex, newIndex));
}

export function onBatchDragCancel() {
    appStore.set(batchDraggingIdAtom, undefined);
}
