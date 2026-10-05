import { atom } from 'jotai';
import { appStore } from '@/components/4-dialogs/7-0-dialogs/store';
import { onFileReset } from '@/editor/0-core/7-actions/lifecycle.ts';

// State of the tracks editor (upstream StreamsSelector local state)

export interface EditingStream {
    streamId: number;
    path: string;
}

/** File whose metadata/offset is edited in the "Edit file metadata" dialog */
export const editingFileAtom = atom<string | undefined>(undefined);
export const editingStreamAtom = atom<EditingStream | undefined>(undefined);
/** Tag being edited in the tag editor of the open dialog. Blocks closing with "Done" */
export const editingTagKeyAtom = atom<string | undefined>(undefined);

export function setEditingFile(path: string | undefined) {
    appStore.set(editingFileAtom, path);
    appStore.set(editingTagKeyAtom, undefined);
}

export function setEditingStream(stream: EditingStream | undefined) {
    appStore.set(editingStreamAtom, stream);
    appStore.set(editingTagKeyAtom, undefined);
}

onFileReset(() => {
    appStore.set(editingFileAtom, undefined);
    appStore.set(editingStreamAtom, undefined);
    appStore.set(editingTagKeyAtom, undefined);
});
