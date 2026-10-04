import { type ComponentProps, type ReactNode } from 'react';
import { MenubarItem, MenubarShortcut } from '@/ui/shadcn/menubar';

import { type MenuAction, runMenuAction } from '@/editor/0-core/menu-actions/index.ts';
import { getAppInfo } from '@/editor/0-core/8-lib/main-api.ts';

export function modShortcut(key: string, shift = false) {
    const { isMac } = getAppInfo();
    if (isMac) {
        return `⌘${shift ? '⇧' : ''}${key}`;
    }
    return `Ctrl+${shift ? 'Shift+' : ''}${key}`;
}

export function MenuActionItem({ label, shortcut, action, disabled, ...rest }: {
    label: ReactNode;
    shortcut?: string;
    action: MenuAction;
    disabled?: boolean;
} & ComponentProps<typeof MenubarItem>) {
    return (
        <MenubarItem className="whitespace-nowrap" disabled={disabled} onSelect={() => { runMenuAction(action); }} {...rest}>
            {label}
            {shortcut != null && <MenubarShortcut>{shortcut}</MenubarShortcut>}
        </MenubarItem>
    );
}
