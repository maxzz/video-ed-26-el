import { atom } from 'jotai';
import { observe } from 'jotai-effect';
import { appStore } from '@/components/4-dialogs/7-0-dialogs/store';
import { workingAtom } from '@/editor/0-core/9-state/working.ts';

/**
 * Time since the current operation started. Reassures the user that the app is not frozen,
 * because some ffmpeg operations can take a long time without giving any progress updates https://github.com/mifi/lossless-cut/issues/2746
 */
export const workingElapsedMsAtom = atom(0);

const isWorkingAtom = atom((get) => get(workingAtom) != null);

export function initWorkingTimer() {
    observe((get) => {
        if (!get(isWorkingAtom)) return undefined;
        const startedAt = Date.now();
        appStore.set(workingElapsedMsAtom, 0);
        const interval = setInterval(() => appStore.set(workingElapsedMsAtom, Date.now() - startedAt), 100);
        return () => clearInterval(interval);
    }, appStore);
}
