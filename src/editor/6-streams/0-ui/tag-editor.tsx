import type { FormEvent } from 'react';
import { useSnapshot } from 'valtio';
import { cn } from '@/utils/classnames';
import { useLocalProxy } from '@/utils/local-utils/use-local-proxy.ts';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/shadcn/tooltip';
import { CheckIcon, ClipboardListIcon, ClipboardPasteIcon, InfoIcon, PencilIcon, PlusIcon, Trash2Icon, TriangleAlertIcon, Undo2Icon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { mainApi } from '@/editor/0-core/7-actions/0-main-api.ts';
import { errorToast } from '@/components/4-dialogs/7-1-dialogs/00-app-dialogs.tsx';
import { type SegmentTags, segmentTagsSchema } from '@/editor/0-core/8-lib/9-types-core.ts';
import { CopyClipboardButton } from '@/editor/7-export/0-ui/controls.tsx';
import invariant from 'tiny-invariant';

// Port of upstream components/TagEditor.tsx

interface TagEditorState {
    editingTagVal: string | undefined;
    newTagKey: string | undefined;
    newTagKeyInput: string;
}

const emptyObject = {};

export function TagEditor({ existingTags = emptyObject, customTags = emptyObject, editingTag, setEditingTag, onTagsChange, onTagReset, addTagTitle, tagInfo, canDeleteExisting }: {
    existingTags?: SegmentTags | undefined;
    customTags?: SegmentTags | undefined;
    editingTag: string | undefined;
    setEditingTag: (v: string | undefined) => void;
    onTagsChange: (keyValues: Record<string, string>) => void;
    onTagReset: (tag: string) => void;
    addTagTitle: string;
    tagInfo?: Record<string, { description: string; url?: string; }>;
    canDeleteExisting?: boolean;
}) {
    const state = useLocalProxy<TagEditorState>(() => ({ editingTagVal: undefined, newTagKey: undefined, newTagKeyInput: '' }));
    const snap = useSnapshot(state, { sync: true });
    const { t } = useTranslation();

    const newTagKeyInputError = !!snap.newTagKeyInput && snap.newTagKeyInput.includes('=');

    const effectiveTags: SegmentTags = {
        ...existingTags,
        ...customTags,
        ...(snap.newTagKey && { [snap.newTagKey]: '' }),
    };

    function onResetClick() {
        invariant(editingTag != null);
        onTagReset(editingTag);
        setEditingTag(undefined);
        state.newTagKey = undefined;
    }

    async function onPasteClick() {
        const text = await mainApi.readClipboardText();
        try {
            onTagsChange(segmentTagsSchema.parse(JSON.parse(text)));
        } catch (e) {
            if (e instanceof Error) errorToast(e.message);
        }
    }

    function saveTag() {
        invariant(editingTag != null);
        invariant(state.editingTagVal != null);
        onTagsChange({ [editingTag]: state.editingTagVal });
        setEditingTag(undefined);
    }

    function onEditClick(tag?: string) {
        if (state.newTagKey) {
            saveTag();
            state.newTagKey = undefined;
        } else if (editingTag != null) {
            if (state.editingTagVal !== existingTags[editingTag]) {
                saveTag();
            } else { // If not actually changed, no need to update
                onResetClick();
            }
        } else {
            setEditingTag(tag);
            state.editingTagVal = tag && String(effectiveTags[tag]);
        }
    }

    function onDeleteExistingClick(tag: string) {
        onTagsChange({ [tag]: '' }); // empty string means delete metadata in ffmpeg
        setEditingTag(undefined);
    }

    function onSubmit(e: FormEvent) {
        e.preventDefault();
        onEditClick();
    }

    function add() {
        if (state.newTagKey || editingTag != null) {
            // save any unsaved edit
            onEditClick();
            return;
        }

        const key = state.newTagKeyInput;
        if (!key || newTagKeyInputError || Object.keys(effectiveTags).includes(key)) return;
        setEditingTag(key);
        state.editingTagVal = '';
        state.newTagKey = key;
        state.newTagKeyInput = '';
    }

    function onAddSubmit(e: FormEvent) {
        e.preventDefault();
        add();
    }

    const canAdd = !snap.newTagKey && (editingTag == null || effectiveTags[editingTag] == null);

    return (
        <div className="text-sm flex flex-col gap-3">
            <div className="flex flex-col">
                <AnimatePresence initial={false}>
                    {Object.keys(effectiveTags).map(
                        (tag) => {
                            const editingThis = tag === editingTag;
                            const thisTagCustom = customTags[tag] != null;
                            const thisTagNew = existingTags[tag] == null;
                            const value = effectiveTags[tag];
                            const isDeletedExisting = !!canDeleteExisting && !value && !thisTagNew;
                            const editingOther = editingTag != null && !editingThis;
                            const emphasized = thisTagCustom || isDeletedExisting;
                            const info = tagInfo?.[tag];

                            return (
                                <motion.div
                                    className="py-1 border-b border-border/50 flex items-center gap-2"
                                    key={tag}
                                    layout
                                    transition={{ duration: 0.2 }}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <div className={cn('grow pr-4 break-all', thisTagNew ? 'text-foreground' : 'text-muted-foreground')}>{tag}</div>

                                    {editingThis
                                        ? (
                                            <form className="inline" onSubmit={onSubmit}>
                                                <Input className="h-7" autoFocus placeholder={t('Enter value')} value={snap.editingTagVal ?? ''} onChange={(e) => { state.editingTagVal = e.target.value; }} />
                                            </form>
                                        ) : (
                                            <span className={cn('py-1 break-all', emphasized && 'font-bold', isDeletedExisting ? 'text-destructive' : (emphasized ? 'text-foreground' : 'text-muted-foreground'))}>
                                                {isDeletedExisting ? `<${t('deleted')}>` : (value ? String(value) : `<${t('empty')}>`)}
                                            </span>
                                        )
                                    }

                                    {info && !editingThis && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon-xs" onClick={() => info.url && mainApi.openExternal(info.url)}><InfoIcon /></Button>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-80">{info.description}</TooltipContent>
                                        </Tooltip>
                                    )}

                                    <Button variant="ghost" size="icon-xs" disabled={editingOther} className={cn(editingThis && 'text-primary')} title={t('Edit')} onClick={() => onEditClick(tag)}>
                                        {editingThis ? <CheckIcon /> : <PencilIcon />}
                                    </Button>

                                    {editingThis && thisTagNew && (
                                        <Button variant="ghost" size="icon-xs" className="text-destructive" title={t('Delete')} onClick={onResetClick}><Trash2Icon /></Button>
                                    )}

                                    {editingThis && !thisTagNew && (
                                        <Button variant="ghost" size="icon-xs" className="text-destructive" title={t('Reset')} onClick={onResetClick}><Undo2Icon /></Button>
                                    )}

                                    {canDeleteExisting && !isDeletedExisting && !editingThis && existingTags[tag] != null && (
                                        <Button variant="ghost" size="icon-xs" disabled={editingOther} className="text-destructive" title={t('Delete')} onClick={() => onDeleteExistingClick(tag)}><Trash2Icon /></Button>
                                    )}
                                </motion.div>
                            );
                        }
                    )}
                </AnimatePresence>
            </div>

            <form className={cn('flex items-center gap-2', !canAdd && 'opacity-50')} onSubmit={onAddSubmit}>
                <Input className="h-8" disabled={!canAdd} value={snap.newTagKeyInput} placeholder={addTagTitle} onChange={(e) => { state.newTagKeyInput = e.target.value; }} />
                <Button type="submit" size="icon" disabled={!canAdd} title={addTagTitle}><PlusIcon /></Button>
            </form>

            {newTagKeyInputError && (
                <div className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5"><TriangleAlertIcon className="size-4" />{t('Invalid character(s) found in key')}</div>
            )}

            <div className="flex items-center gap-2">
                <CopyClipboardButton text={JSON.stringify(effectiveTags, null, 2)}>
                    {({ onClick }) => <Button variant="secondary" size="xs" onClick={onClick}><ClipboardListIcon />{t('Copy to clipboard')}</Button>}
                </CopyClipboardButton>
                <Button variant="secondary" size="xs" onClick={onPasteClick}><ClipboardPasteIcon />{t('Paste')}</Button>
            </div>
        </div>
    );
}
