import type { ReactNode } from 'react';
import { atom } from 'jotai';
import { proxy } from 'valtio';
import { nanoid } from 'nanoid';
import { appStore } from './store.ts';

// Promise based dialogs. The option names follow SweetAlert2 which LosslessCut used,
// so ported dialog code maps one to one: `const { value } = await fireDialog({ input: 'text', ... })`.

export type DialogIcon = 'info' | 'warning' | 'error' | 'success' | 'question';
export type DialogInput = 'text' | 'textarea' | 'number' | 'radio' | 'checkbox' | 'select';

export interface FireDialogOptions {
    title?: ReactNode;
    text?: ReactNode;
    html?: ReactNode;
    icon?: DialogIcon;
    input?: DialogInput;
    inputValue?: string | boolean;
    inputPlaceholder?: string;
    inputLabel?: ReactNode;
    inputOptions?: Record<string, ReactNode>;
    inputAttributes?: Record<string, string>;
    /** Return an error message to keep the dialog open */
    inputValidator?: (value: string) => string | null | undefined;
    showConfirmButton?: boolean;
    showCancelButton?: boolean;
    showDenyButton?: boolean;
    showCloseButton?: boolean;
    confirmButtonText?: ReactNode;
    cancelButtonText?: ReactNode;
    denyButtonText?: ReactNode;
    reverseButtons?: boolean;
    focusCancel?: boolean;
    allowOutsideClick?: boolean;
    allowEscapeKey?: boolean;
    dangerConfirm?: boolean;
    /** Tailwind classes for the dialog content, e.g. width */
    className?: string;
}

export interface FireDialogResult<T = string> {
    isConfirmed: boolean;
    isDenied: boolean;
    isDismissed: boolean;
    value?: T | undefined;
}

export interface FireDialogInputState {
    value: string;
    checked: boolean;
    error: string | undefined;
}

export type DialogEntry =
    | { id: string; kind: 'fire'; options: FireDialogOptions; input: FireDialogInputState; resolve: (result: FireDialogResult<string | boolean>) => void; }
    | { id: string; kind: 'custom'; render: (close: (value?: unknown) => void) => ReactNode; resolve: (value: unknown) => void; };

/** Stack of open dialogs, the last one is on top */
export const dialogStackAtom = atom<DialogEntry[]>([]);

function removeDialog(id: string) {
    appStore.set(dialogStackAtom, (prev) => prev.filter((entry) => entry.id !== id));
}

export async function fireDialog<T = string>(options: FireDialogOptions): Promise<FireDialogResult<T>> {
    return new Promise((resolve) => {
        const id = nanoid();
        const input = proxy<FireDialogInputState>({
            value: typeof options.inputValue === 'string' ? options.inputValue : '',
            checked: options.inputValue === true,
            error: undefined,
        });
        const entry: DialogEntry = {
            id,
            kind: 'fire',
            options,
            input,
            resolve: (result) => {
                removeDialog(id);
                resolve(result as FireDialogResult<T>);
            },
        };
        appStore.set(dialogStackAtom, (prev) => [...prev, entry]);
    });
}

/** Opens any React content as a dialog. `close(value)` resolves the promise; Escape/outside click resolves undefined */
export async function openCustomDialog<T>(render: (close: (value?: T) => void) => ReactNode): Promise<T | undefined> {
    return new Promise((resolve) => {
        const id = nanoid();
        const entry: DialogEntry = {
            id,
            kind: 'custom',
            render: render as (close: (value?: unknown) => void) => ReactNode,
            resolve: (value) => {
                removeDialog(id);
                resolve(value as T | undefined);
            },
        };
        appStore.set(dialogStackAtom, (prev) => [...prev, entry]);
    });
}

export function closeAllDialogs() {
    for (const entry of appStore.get(dialogStackAtom)) {
        if (entry.kind === 'fire') {
            entry.resolve({ isConfirmed: false, isDenied: false, isDismissed: true });
        } else {
            entry.resolve(undefined);
        }
    }
}

export const isAnyDialogOpenAtom = atom((get) => get(dialogStackAtom).length > 0);
