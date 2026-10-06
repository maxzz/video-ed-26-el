import { atom } from 'jotai';
import { jotaiDefaultStore } from '@/utils/local-utils/9-jotai-default-store';
import { onFileReset } from '@/editor/0-core/7-actions/2-lifecycle';

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
    jotaiDefaultStore.set(editingFileAtom, path);
    jotaiDefaultStore.set(editingTagKeyAtom, undefined);
}

export function setEditingStream(stream: EditingStream | undefined) {
    jotaiDefaultStore.set(editingStreamAtom, stream);
    jotaiDefaultStore.set(editingTagKeyAtom, undefined);
}

onFileReset(() => {
    jotaiDefaultStore.set(editingFileAtom, undefined);
    jotaiDefaultStore.set(editingStreamAtom, undefined);
    jotaiDefaultStore.set(editingTagKeyAtom, undefined);
});
