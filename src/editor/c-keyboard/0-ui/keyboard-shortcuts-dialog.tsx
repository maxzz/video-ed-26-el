import type { ReactNode } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import groupBy from 'lodash/groupBy.js';
import { HammerIcon, MouseIcon, PlusIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react';
import type { KeyboardAction, ModifierKey } from '@shared/types.ts';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { userSettingsAtom } from '@/editor/0-core/9-state/user-settings.ts';
import { runAction } from '@/editor/0-core/7-actions/actions-registry.ts';
import { keyboardShortcutsVisibleAtom } from '@/editor/1-layout/9-state/panels-atoms.ts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/ui/shadcn/dialog';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { Kbd } from '@/ui/shadcn/kbd';
import { shortcutsSearchAtom } from '../9-state/keyboard-atoms.ts';
import { deleteKeyBinding, resetKeyBindings, startCreatingBinding } from '../7-actions/key-bindings.ts';
import { type ActionInfo, getActionCategories, getActionsMap, getModifier } from '../8-lib/actions-map.ts';
import { KeyCombo } from './key-combo.tsx';

// Port of upstream components/KeyboardShortcuts.tsx

export function KeyboardShortcutsDialog() {
    const { t } = useTranslation();
    const [open, setOpen] = useAtom(keyboardShortcutsVisibleAtom);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="p-0 w-[min(46rem,calc(100vw-2rem))] max-w-none! h-[min(80vh,52rem)] text-xs overflow-hidden gap-0 flex flex-col">
                <DialogHeader className="px-4 py-3 border-b">
                    <DialogTitle className="text-sm">{t('Keyboard & mouse shortcuts')}</DialogTitle>
                    <DialogDescription className="sr-only">{t('Keyboard & mouse shortcuts')}</DialogDescription>
                </DialogHeader>

                {open && <ShortcutsBody />}
            </DialogContent>
        </Dialog>
    );
}

function ShortcutsBody() {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useAtom(shortcutsSearchAtom);
    const query = searchQuery.toLowerCase().trim();
    const isSearching = query !== '';

    const actionsMap = getActionsMap();
    const actionEntries = (Object.entries(actionsMap) as [KeyboardAction, ActionInfo][]).filter(([action, { name, category }]) => (
        !isSearching
        || action.toLowerCase().includes(query)
        || name.toLowerCase().includes(query)
        || (category != null && category.toLowerCase().includes(query))
    ));
    const categoriesWithActions = Object.entries(groupBy(actionEntries, ([, { category }]) => category));

    return (<>
        <div className="px-4 py-2 border-b">
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('Search')} className="h-8 text-xs" autoFocus />
        </div>

        <div className="px-4 pb-4 min-h-0 overflow-y-auto flex-1">
            {categoriesWithActions.map(([category, entries]) => (
                <section key={category}>
                    {category !== 'undefined' && (
                        <h3 className="sticky top-0 pt-4 pb-1.5 text-sm font-semibold bg-background z-10">{category}</h3>
                    )}

                    {entries.map(([action, { name }]) => <ActionRow key={action} action={action} name={name} />)}

                    {!isSearching && <ExtraLines category={category} />}
                </section>
            ))}

            {categoriesWithActions.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">{t('No results')}</div>
            )}

            {!isSearching && (
                <Button className="mt-4" variant="outline" size="sm" onClick={resetKeyBindings}>
                    <RotateCcwIcon />
                    {t('Reset')}
                </Button>
            )}
        </div>
    </>);
}

function ActionRow({ action, name }: { action: KeyboardAction; name: string; }) {
    const { t } = useTranslation();
    const { keyBindings } = useAtomValue(userSettingsAtom);
    const bindings = keyBindings.filter((kb) => kb.action === action);

    function trigger() {
        appStore.set(keyboardShortcutsVisibleAtom, false);
        runAction(action);
    }

    return (
        <div className="py-1 border-b border-border/60 flex items-center gap-2">
            <div className="min-w-0 flex-1">
                <div className="truncate" title={action}>{name}</div>
                <div className="text-[0.65rem] text-muted-foreground/70 flex items-center gap-1" title={t('API action name: {{action}}', { action })}>
                    {action}
                    <Button className="size-4" variant="ghost" size="icon-xs" title={action} onClick={trigger}>
                        <HammerIcon className="size-2.5" />
                    </Button>
                </div>
            </div>

            <div className="flex flex-col items-end gap-0.5">
                {bindings.map((binding) => (
                    <div key={binding.keys} className="flex items-center gap-1.5">
                        <KeyCombo keys={binding.keys} />
                        <Button variant="ghost" size="icon-xs" title={t('Remove key binding')} onClick={() => deleteKeyBinding(binding)}>
                            <Trash2Icon />
                        </Button>
                    </div>
                ))}
                {bindings.length === 0 && <span className="text-muted-foreground">{t('No binding')}</span>}
            </div>

            <Button variant="outline" size="icon-xs" title={t('Bind new key to action')} onClick={() => startCreatingBinding(action)}>
                <PlusIcon />
            </Button>
        </div>
    );
}

function ExtraLines({ category }: { category: string; }) {
    const { t } = useTranslation();
    const { mouseWheelZoomModifierKey, mouseWheelFrameSeekModifierKey, mouseWheelKeyframeSeekModifierKey, segmentMouseModifierKey } = useAtomValue(userSettingsAtom);
    const c = getActionCategories();
    const wheelText = t('Mouse scroll/wheel up/down');

    if (category === c.zoomOperations) {
        return (
            <div className="mt-2">
                <MouseRow text={t('Pan timeline')} mouseText={wheelText} />
                <MouseRow text={t('Seek one frame')} mouseText={wheelText} modifier={mouseWheelFrameSeekModifierKey} />
                <MouseRow text={t('Seek one key frame')} mouseText={wheelText} modifier={mouseWheelKeyframeSeekModifierKey} />
                <MouseRow text={t('Zoom in/out timeline')} mouseText={wheelText} modifier={mouseWheelZoomModifierKey} />
            </div>
        );
    }
    if (category === c.segmentsAndCutpoints) {
        return (
            <div className="mt-2">
                <MouseRow text={t('Manipulate segments on timeline')} mouseText={t('Mouse click and drag')} modifier={segmentMouseModifierKey} />
            </div>
        );
    }
    return null;
}

function MouseRow({ text, mouseText, modifier }: { text: ReactNode; mouseText: ReactNode; modifier?: ModifierKey; }) {
    return (
        <div className="py-1 border-b border-border/60 flex items-center gap-2">
            <span className="flex-1">{text}</span>
            {modifier && <Kbd className="text-foreground/80 border">{getModifier(modifier)}</Kbd>}
            <MouseIcon className="size-3.5" />
            <span className="text-muted-foreground">{mouseText}</span>
        </div>
    );
}
