import type { ReactNode } from 'react';
import { getAppInfo } from '@/editor/0-core/8-lib/main-api.ts';
import { runMenuAction, type MenuAction } from '@/editor/0-core/menu-actions/index.ts';
import { MenubarItem, MenubarShortcut } from '@/ui/shadcn/menubar';

export function modShortcut(key: string, shift = false) {
    const { isMac } = getAppInfo();
    if (isMac) {
        return `⌘${shift ? '⇧' : ''}${key}`;
    }
    return `Ctrl+${shift ? 'Shift+' : ''}${key}`;
}

export function MenuActionItem({ label, shortcut, action, disabled }: {
    label: ReactNode;
    shortcut?: string;
    action: MenuAction;
    disabled?: boolean;
}) {
    return (
        <MenubarItem className="whitespace-nowrap" disabled={disabled} onSelect={() => { runMenuAction(action); }}>
            {label}
            {shortcut != null && <MenubarShortcut>{shortcut}</MenubarShortcut>}
        </MenubarItem>
    );
}
