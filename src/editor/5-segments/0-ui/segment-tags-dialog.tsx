import type { FormEvent } from 'react';
import { useAtomValue } from 'jotai';
import { proxy, useSnapshot } from 'valtio';
import { useTranslation } from 'react-i18next';
import { CheckIcon, ClipboardIcon, ClipboardListIcon, PencilIcon, PlusIcon, SaveIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/ui/shadcn/dialog';
import { cn } from '@/utils/classnames';
import type { SegmentTags } from '@/editor/0-core/8-lib/types.ts';
import { segmentTagsSchema } from '@/editor/0-core/8-lib/types.ts';
import { jotaiDefaultStore } from '@/utils/local-utils/9-jotai-default-store.ts';
import { mainApi } from '@/editor/0-core/7-actions/0-main-api.ts';
import { errorToast } from '@/editor/0-core/8-lib/app-dialogs.tsx';
import { editingSegmentTagsAtom, editingSegmentTagsSegmentIndexAtom } from '@/components/2-main/0-all/a-panels-atoms.ts';
import { closeSegmentTagsEditor, saveSegmentTags } from '../7-actions/segment-dialogs.tsx';

// Upstream SegmentList "Edit segment tags" dialog with a port of TagEditor (for segment tags there are no existing tags, only custom ones)

const editor = proxy({
    editingTag: undefined as string | undefined,
    editingTagVal: '',
    newTagKey: undefined as string | undefined,
    newTagKeyInput: '',
});

function resetEditor() {
    editor.editingTag = undefined;
    editor.editingTagVal = '';
    editor.newTagKey = undefined;
    editor.newTagKeyInput = '';
}

const getTags = () => jotaiDefaultStore.get(editingSegmentTagsAtom) ?? {};

function onTagsChange(keyValues: SegmentTags) {
    jotaiDefaultStore.set(editingSegmentTagsAtom, (existingTags) => ({ ...existingTags, ...keyValues }));
}

function onTagReset(tag: string) {
    jotaiDefaultStore.set(editingSegmentTagsAtom, (tags) => {
        const { [tag]: _deleted, ...rest } = tags ?? {};
        return rest;
    });
}

function getEffectiveTags(): SegmentTags {
    return { ...getTags(), ...(editor.newTagKey && { [editor.newTagKey]: '' }) };
}

function onResetClick() {
    if (editor.editingTag != null) onTagReset(editor.editingTag);
    editor.editingTag = undefined;
    editor.newTagKey = undefined;
}

function saveTag() {
    if (editor.editingTag == null) return;
    onTagsChange({ [editor.editingTag]: editor.editingTagVal });
    editor.editingTag = undefined;
}

function onEditClick(tag?: string) {
    if (editor.newTagKey) {
        saveTag();
        editor.newTagKey = undefined;
    } else if (editor.editingTag != null) {
        saveTag();
    } else if (tag != null) {
        editor.editingTag = tag;
        editor.editingTagVal = String(getEffectiveTags()[tag] ?? '');
    }
}

const isNewTagKeyInputError = (input: string) => !!input && input.includes('=');

function add() {
    if (editor.newTagKey || editor.editingTag != null) {
        onEditClick(); // save any unsaved edit
        return;
    }
    const input = editor.newTagKeyInput;
    if (!input || isNewTagKeyInputError(input) || Object.keys(getEffectiveTags()).includes(input)) return;
    editor.editingTag = input;
    editor.editingTagVal = '';
    editor.newTagKey = input;
    editor.newTagKeyInput = '';
}

async function onPasteClick() {
    const text = await mainApi.readClipboardText();
    try {
        onTagsChange(segmentTagsSchema.parse(JSON.parse(text)));
    } catch (err) {
        if (err instanceof Error) errorToast(err.message);
    }
}

export function SegmentTagsDialog() {
    const { t } = useTranslation();
    const index = useAtomValue(editingSegmentTagsSegmentIndexAtom);
    const snap = useSnapshot(editor);

    function onOpenChange(open: boolean) {
        if (open) return;
        closeSegmentTagsEditor();
        resetEditor();
    }

    function onSave() {
        saveSegmentTags();
        resetEditor();
    }

    return (
        <Dialog open={index != null} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[40em]" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t('Edit segment tags')}</DialogTitle>
                </DialogHeader>

                <TagEditor />

                <DialogFooter>
                    <Button disabled={snap.editingTag != null} onClick={onSave}>
                        <SaveIcon />
                        {t('Save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function TagEditor() {
    const { t } = useTranslation();
    const tags = useAtomValue(editingSegmentTagsAtom) ?? {};
    const snap = useSnapshot(editor, { sync: true });

    const effectiveTags: SegmentTags = { ...tags, ...(snap.newTagKey && { [snap.newTagKey]: '' }) };
    const canAdd = !snap.newTagKey && (snap.editingTag == null || effectiveTags[snap.editingTag] == null);
    const newTagKeyInputError = isNewTagKeyInputError(snap.newTagKeyInput);

    function onSubmit(e: FormEvent) {
        e.preventDefault();
        onEditClick();
    }

    function onAddSubmit(e: FormEvent) {
        e.preventDefault();
        add();
    }

    return (
        <div className="text-sm flex flex-col gap-3">
            <table className="w-full">
                <tbody>
                    {Object.keys(effectiveTags).map((tag) => {
                        const editingThis = tag === snap.editingTag;
                        const editingOther = snap.editingTag != null && !editingThis;
                        const value = effectiveTags[tag];
                        return (
                            <tr key={tag}>
                                <td className="pr-4 text-foreground">{tag}</td>
                                <td className="flex items-center justify-end gap-2">
                                    {editingThis ? (
                                        <form className="inline" onSubmit={onSubmit}>
                                            <Input autoFocus placeholder={t('Enter value')} value={snap.editingTagVal} onChange={(e) => { editor.editingTagVal = e.target.value; }} />
                                        </form>
                                    ) : (
                                        <span className="py-1 font-bold">{value ? String(value) : `<${t('empty')}>`}</span>
                                    )}

                                    <Button size="icon-xs" variant="ghost" disabled={editingOther} title={t('Edit')} onClick={() => onEditClick(tag)}>
                                        {editingThis ? <CheckIcon /> : <PencilIcon />}
                                    </Button>

                                    {editingThis && (
                                        <Button size="icon-xs" variant="ghost" className="text-destructive" title={t('Delete')} onClick={onResetClick}>
                                            <Trash2Icon />
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <form className={cn('flex items-center gap-2', !canAdd && 'opacity-50')} onSubmit={onAddSubmit}>
                <Input disabled={!canAdd} value={snap.newTagKeyInput} placeholder={t('Add segment tag')} onChange={(e) => { editor.newTagKeyInput = e.target.value; }} />
                <Button type="submit" size="icon" disabled={!canAdd} title={t('Add segment tag')}>
                    <PlusIcon />
                </Button>
            </form>

            {newTagKeyInputError && <div className="text-amber-600 dark:text-amber-400">{t('Invalid character(s) found in key')}</div>}

            <div className="flex items-center gap-1">
                <Button size="sm" variant="secondary" onClick={() => mainApi.writeClipboardText(JSON.stringify(effectiveTags, null, 2))}>
                    <ClipboardListIcon />
                    {t('Copy to clipboard')}
                </Button>
                <Button size="sm" variant="secondary" onClick={onPasteClick}>
                    <ClipboardIcon />
                    {t('Paste')}
                </Button>
            </div>
        </div>
    );
}
