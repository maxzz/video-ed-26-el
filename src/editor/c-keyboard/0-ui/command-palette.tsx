import { useAtomValue } from 'jotai';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';
import groupBy from 'lodash/groupBy.js';
import { userSettingsAtom } from '@/editor/0-core/9-state/user-settings.ts';
import { actionsVersionAtom, getActionNames, hasAction } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { commandPaletteOpenAtom } from '@/components/2-main/0-all/a-panels-atoms.ts';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/ui/shadcn/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from '@/ui/shadcn/command';
import { runPaletteAction, setCommandPaletteOpen } from '../7-actions/command-palette.ts';
import { actionsWithArgs, getActionsMap, getExtraActionsMap, humanizeActionName } from '../8-lib/actions-map.ts';
import { KeyCombo } from './key-combo.tsx';

interface PaletteItem {
    id: string;
    action: string;
    args?: unknown[];
    title: string;
    category: string;
}

function getPaletteItems(): PaletteItem[] {
    const actionsMap: Record<string, { name: string; category?: string | undefined; }> = { ...getActionsMap(), ...getExtraActionsMap() };
    const general = '';

    const items: PaletteItem[] = getActionNames()
        .filter((name) => !actionsWithArgs.has(name))
        .map((name) => ({
            id: name,
            action: name,
            title: actionsMap[name]?.name ?? humanizeActionName(name),
            category: actionsMap[name]?.category ?? general,
        }));

    if (hasAction('importEdlFile')) items.push({ id: 'importEdlFile:llc', action: 'importEdlFile', args: ['llc'], title: i18n.t('Import project (LLC)...'), category: general });
    if (hasAction('exportEdlFile')) items.push({ id: 'exportEdlFile:llc', action: 'exportEdlFile', args: ['llc'], title: i18n.t('Export project (LLC)...'), category: general });

    return items.sort((a, b) => a.title.localeCompare(b.title));
}

export function CommandPalette() {
    const { t } = useTranslation();
    const open = useAtomValue(commandPaletteOpenAtom);

    return (
        <Dialog open={open} onOpenChange={setCommandPaletteOpen}>
            <DialogContent className="top-1/4 p-0 max-w-xl translate-y-0 rounded-xl! overflow-hidden" noClose>
                <DialogTitle className="sr-only">{t('Command palette')}</DialogTitle>
                <DialogDescription className="sr-only">{t('Search for a command to run...')}</DialogDescription>
                {open && <PaletteBody />}
            </DialogContent>
        </Dialog>
    );
}

function PaletteBody() {
    const { t } = useTranslation();
    useAtomValue(actionsVersionAtom); // re-render when features register more actions
    const { keyBindings } = useAtomValue(userSettingsAtom);

    const items = getPaletteItems();
    const groups = Object.entries(groupBy(items, (item) => item.category)).sort(([a], [b]) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b)));

    return (
        <Command className="rounded-none!">
            <CommandInput placeholder={t('Search for a command to run...')} autoFocus />
            <CommandList className="max-h-[min(60vh,28rem)]">
                <CommandEmpty>{t('No results')}</CommandEmpty>

                {groups.map(([category, groupItems]) => (
                    <CommandGroup key={category} heading={category || undefined}>
                        {groupItems.map((item) => {
                            const binding = keyBindings.find((kb) => kb.action === item.action && item.args == null);
                            return (
                                <CommandItem
                                    key={item.id}
                                    value={`${item.title} ${item.id}`}
                                    keywords={[item.action, item.category]}
                                    onSelect={() => runPaletteAction(item.action, item.args)}
                                >
                                    <span className="truncate">{item.title}</span>
                                    {binding && (
                                        <CommandShortcut className="tracking-normal">
                                            <KeyCombo keys={binding.keys} />
                                        </CommandShortcut>
                                    )}
                                </CommandItem>
                            );
                        })}
                    </CommandGroup>
                ))}
            </CommandList>
        </Command>
    );
}
