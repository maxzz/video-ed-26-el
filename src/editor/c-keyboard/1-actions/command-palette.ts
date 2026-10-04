import { appStore } from '@/editor/0-core/0-state/store.ts';
import { runAction } from '@/editor/0-core/1-actions/actions-registry.ts';
import { commandPaletteOpenAtom } from '@/editor/1-layout/0-state/panels-atoms.ts';

export function toggleCommandPalette() {
    appStore.set(commandPaletteOpenAtom, (v) => !v);
}

export function setCommandPaletteOpen(open: boolean) {
    appStore.set(commandPaletteOpenAtom, open);
}

export function runPaletteAction(name: string, args: unknown[] = []) {
    appStore.set(commandPaletteOpenAtom, false);
    // let the palette dialog close and return focus before the action opens its own UI
    setTimeout(() => runAction(name, ...args), 0);
}
