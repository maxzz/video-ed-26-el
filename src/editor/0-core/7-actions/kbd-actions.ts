import { atom } from 'jotai';
import { appStore } from '../9-state/store.ts';
import { handleError } from '../9-state/working.ts';

//---------------------------------------------------------------------------
// Keyboard actions

/**
 * Single dispatch point for keyboard shortcuts, the HTTP API and the command palette.
 * Features register their actions from the `<folder>-register` function that main.tsx calls at startup.
 * Names of keyboard actions must stay compatible with upstream (users have bound keys by these names).
 */

export type ActionFn = (...args: never[]) => unknown;

export interface ActionDef {
    run: ActionFn;
    keyup?: () => void; // Called on key up for keyboard bound actions (e.g. to reset seek acceleration)
}

const registry = new Map<string, ActionDef>();

/** Incremented whenever actions are (re)registered, so the command palette can react */
export const actionsVersionAtom = atom(0);

export function registerActions(actions: Record<string, ActionFn | ActionDef>) {
    for (const [name, fnOrDef] of Object.entries(actions)) {
        if (import.meta.env.DEV && registry.has(name)) {
            console.warn('Action registered twice, the last one wins:', name);
        }
        registry.set(name, typeof fnOrDef === 'function' ? { run: fnOrDef } : fnOrDef);
    }

    appStore.set(actionsVersionAtom, (v) => v + 1);
}

//---------------------------------------------------------------------------

export function hasAction(name: string) {
    return registry.has(name);
}

export function getActionNames() {
    return [...registry.keys()];
}

export function getKeyupAction(name: string) {
    return registry.get(name)?.keyup;
}

/** Runs an action. Errors are shown in the generic error dialog. Returns false if the action does not exist */
export async function runAction(name: string, ...args: unknown[]) {
    const def = registry.get(name);
    if (!def) {
        console.warn('Action not found:', name);
        return false;
    }
    try {
        await (def.run as (...a: unknown[]) => unknown)(...args);
    } catch (err) {
        handleError({ err });
    }
    return true;
}

//---------------------------------------------------------------------------