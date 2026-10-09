import { type ComponentProps, type ReactNode } from "react";
import { MenubarCheckboxItem, MenubarItem, MenubarShortcut } from "@/ui/shadcn/menubar";

import { type MenuAction, runMenuAction } from "@/components/1-header/1-top-menu-actions";
import { getAppInfo } from "@/editor/0-core/7-actions/0-main-api";

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

export function MenuCheckboxItem({ label, checked, action, disabled }: {
    label: ReactNode;
    checked: boolean;
    action: MenuAction;
    disabled?: boolean;
}) {
    return (
        <MenubarCheckboxItem className="whitespace-nowrap" checked={checked} disabled={disabled} onCheckedChange={() => { runMenuAction(action); }}>
            {label}
        </MenubarCheckboxItem>
    );
}

export function modShortcut(key: string, shift = false) {
    const { isMac } = getAppInfo();
    if (isMac) {
        return `⌘${shift ? '⇧' : ''}${key}`;
    }
    return `Ctrl+${shift ? 'Shift+' : ''}${key}`;
}
