import { atom } from "jotai";
import { observe } from "jotai-effect";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { workingAtom } from "@/editor/0-core/9-state/working";

/**
 * Time since the current operation started. Reassures the user that the app is not frozen,
 * because some ffmpeg operations can take a long time without giving any progress updates https://github.com/mifi/lossless-cut/issues/2746
 */
export const workingElapsedMsAtom = atom(0);

const isWorkingAtom = atom((get) => get(workingAtom) != null);

export function initWorkingTimer() {
    observe(
        (get) => {
            if (!get(isWorkingAtom)) return undefined;
            const startedAt = Date.now();
            jotaiDefaultStore.set(workingElapsedMsAtom, 0);
            const interval = setInterval(() => jotaiDefaultStore.set(workingElapsedMsAtom, Date.now() - startedAt), 100);
            return () => clearInterval(interval);
        },
        jotaiDefaultStore);
}
