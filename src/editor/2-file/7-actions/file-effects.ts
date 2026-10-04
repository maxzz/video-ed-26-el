import { atom } from 'jotai';
import { observe } from 'jotai-effect';
import { appStore } from '@/editor/0-core/0-state/store.ts';
import { userSettingsAtom } from '@/editor/0-core/0-state/user-settings.ts';
import { progressAtom, workingAtom } from '@/editor/0-core/0-state/working.ts';
import { mainApi } from '@/editor/0-core/2-lib/main-api.ts';
import { setDocumentTitle } from '@/editor/0-core/2-lib/util.ts';
import { canRedoAtom, canUndoAtom, cutSegmentsAtom } from '@/editor/5-segments/0-state/segments-store.ts';
import { filePathAtom, isFileOpenedAtom } from '../0-state/file-atoms.ts';
import { initProjectAutoSave } from './project-auto-save.ts';
import { applyCustomFfPath } from './startup-check.ts';

const askBeforeCloseAtom = atom((get) => get(userSettingsAtom).askBeforeClose && get(isFileOpenedAtom));
const customFfPathAtom = atom((get) => get(userSettingsAtom).customFfPath);
const menuStateAtom = atom((get) => ({
    isFileOpened: get(isFileOpenedAtom),
    hasSegments: get(cutSegmentsAtom).length > 0,
    canUndo: get(canUndoAtom),
    canRedo: get(canRedoAtom),
}));

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
    }, appStore);

    observe((get) => {
        mainApi.setProgressBar(get(progressAtom) ?? -1);
    }, appStore);

    observe((get) => {
        mainApi.setAskBeforeClose(get(askBeforeCloseAtom));
    }, appStore);

    observe((get) => {
        mainApi.setMenuState(get(menuStateAtom));
    }, appStore);

    observe((get) => {
        applyCustomFfPath(get(customFfPathAtom));
    }, appStore);

    initProjectAutoSave();
}
