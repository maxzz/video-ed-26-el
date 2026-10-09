import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";

import { runAction } from "@/editor/0-core/7-actions/kbd-actions";
import { commandPaletteOpenAtom } from "@/components/2-main/0-all/a-panels-atoms";

export function tmcmd_view_toggleCommandPalette() {
    jotaiDefaultStore.set(commandPaletteOpenAtom, (v) => !v);
}

export function setCommandPaletteOpen(open: boolean) {
    jotaiDefaultStore.set(commandPaletteOpenAtom, open);
}

export function runPaletteAction(name: string, args: unknown[] = []) {
    jotaiDefaultStore.set(commandPaletteOpenAtom, false);
    // let the palette dialog close and return focus before the action opens its own UI
    setTimeout(() => runAction(name, ...args), 0);
}
