import { atom } from 'jotai';
import { observe } from 'jotai-effect';
import { jotaiDefaultStore } from '@/utils/local-utils/9-jotai-default-store';
import { onFileReset } from '@/editor/0-core/7-actions/2-lifecycle';
import { currentCutSegAtom } from '@/editor/5-segments/9-state/segments-store.ts';

export { areWeCuttingAtom } from '@/editor/7-export/9-state/export-atoms.ts';

/** Text typed into the bottom bar cut time inputs, undefined when showing the segment time */
export const cutTimeManualAtoms = {
    start: atom<string | undefined>(undefined),
    end: atom<string | undefined>(undefined),
};

export const cutTimeErrorAtoms = {
    start: atom(false),
    end: atom(false),
};

export function clearCutTimeManual() {
    for (const side of ['start', 'end'] as const) {
        jotaiDefaultStore.set(cutTimeManualAtoms[side], undefined);
        jotaiDefaultStore.set(cutTimeErrorAtoms[side], false);
    }
}

const currentCutSegTimesAtom = atom((get) => {
    const seg = get(currentCutSegAtom);
    return `${seg?.start}-${seg?.end}`;
});

// Clear manual overrides if the cut time has changed
observe((get) => {
    get(currentCutSegTimesAtom);
    clearCutTimeManual();
}, jotaiDefaultStore);

onFileReset(clearCutTimeManual);
