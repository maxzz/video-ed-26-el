import { atom } from 'jotai';
import { observe } from 'jotai-effect';
import { jotaiDefaultStore } from '@/utils/local-utils/9-jotai-default-store.ts';
import { userSettingsAtom } from '@/editor/0-core/9-state/user-settings.ts';
import { progressAtom, workingAtom } from '@/editor/0-core/9-state/working.ts';
import { mainApi } from '@/editor/0-core/7-actions/0-main-api.ts';
import { setDocumentTitle } from '@/editor/0-core/8-lib/util.ts';
import { filePathAtom, isFileOpenedAtom } from '../9-state/a-file-atoms.ts';
import { initProjectAutoSave } from './project-auto-save.ts';
import { applyCustomFfPath } from './startup-check.ts';

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
