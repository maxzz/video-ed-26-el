import { atom } from "jotai";
import { observe } from "jotai-effect";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { userSettingsAtom } from "@/editor/0-core/9-state/user-settings";
import { progressAtom, workingAtom } from "@/editor/0-core/9-state/working";
import { mainApi } from "@/editor/0-core/7-actions/0-main-api";
import { setDocumentTitle } from "@/editor/0-core/8-lib/util";
import { filePathAtom, isFileOpenedAtom } from "../9-state/a-file-atoms";
import { initProjectAutoSave } from "./project-auto-save";
import { applyCustomFfPath } from "./startup-check";

const askBeforeCloseAtom = atom((get) => get(userSettingsAtom).askBeforeClose && get(isFileOpenedAtom));
const customFfPathAtom = atom((get) => get(userSettingsAtom).customFfPath);

let initialized = false;

/**
 * Starts the reactions of the file feature. Must run after initEditor() (app info, settings and i18n are loaded),
 * so it is called from the FileHosts ref callback rather than at module load.
 */
export function initFileEffects() {
    if (initialized) return;
    initialized = true;

    observe((get) => {
        setDocumentTitle({ filePath: get(filePathAtom), working: get(workingAtom)?.text, progress: get(progressAtom) });
    }, jotaiDefaultStore);

    observe((get) => {
        mainApi.setProgressBar(get(progressAtom) ?? -1);
    }, jotaiDefaultStore);

    observe((get) => {
        mainApi.setAskBeforeClose(get(askBeforeCloseAtom));
    }, jotaiDefaultStore);

    observe((get) => {
        applyCustomFfPath(get(customFfPathAtom));
    }, jotaiDefaultStore);

    initProjectAutoSave();
}
