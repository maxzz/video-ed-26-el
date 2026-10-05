import { appStore } from '@/components/4-dialogs/7-0-dialogs/store';
import { runAction } from '@/editor/0-core/7-actions/kbd-actions';
import { commandPaletteOpenAtom } from '@/components/2-main/0-all/a-panels-atoms';

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
