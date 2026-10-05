import { atom } from 'jotai';
import { observe } from 'jotai-effect';
import debounce from 'lodash/debounce';
import isEqual from 'lodash/isEqual';
import i18n from 'i18next';

import { jotaiDefaultStore } from '@/utils/local-utils/9-jotai-default-store.ts';
import { type StateSegment } from '@/editor/0-core/8-lib/9-types-core.ts';
import { customOutDirAtom, userSettingsAtom } from '@/editor/0-core/9-state/user-settings.ts';
import { errorToast } from '@/components/4-dialogs/7-1-dialogs/00-app-dialogs.tsx';
import { getAppInfo } from '@/editor/0-core/7-actions/0-main-api.ts';
import { getSuffixedOutPath } from '@/editor/0-core/8-lib/util.ts';
import { cutSegmentsAtom } from '@/editor/5-segments/9-state/segments-store.ts';
import { mapSaveableSegments } from '@/editor/5-segments/8-lib/segments.ts';
import { saveLlcProject } from '@/editor/9-edl/8-lib/edl-store.ts';
import { filePathAtom } from '../9-state/a-file-atoms.ts';

// Port of upstream useSegmentsAutoSave

/** New LLC format can be stored along with input file or in working dir (customOutDir) */
export function getEdlFilePath(fp?: string, cod?: string) {
    return getSuffixedOutPath({ customOutDir: cod, filePath: fp, nameSuffix: projectSuffix });
}

const projectSuffix = 'proj.llc';

export function getProjectFileSavePath(storeProjectInWorkingDir: boolean) {
    return getEdlFilePath(jotaiDefaultStore.get(filePathAtom), storeProjectInWorkingDir ? jotaiDefaultStore.get(customOutDirAtom) : undefined);
}

const storeProjectInWorkingDirAtom = atom((get) => get(userSettingsAtom).storeProjectInWorkingDir);

export const projectFileSavePathAtom = atom((get) => getEdlFilePath(get(filePathAtom), get(storeProjectInWorkingDirAtom) ? get(customOutDirAtom) : undefined));

//---------------------------------------------------------------------------

/** NOTE: Could lose a save if user closes too fast, but not a big issue I think */
export function initProjectAutoSave() {
    const debouncedSave = debounce(save, getAppInfo().isDev ? 2000 : 500);

    observe(
        (get) => {
            const projectFileSavePath = get(projectFileSavePathAtom);
            if (!projectFileSavePath) {
                debouncedSave(undefined);
                return;
            }
            debouncedSave({
                cutSegments: get(cutSegmentsAtom) as StateSegment[],
                projectFileSavePath,
                filePath: get(filePathAtom),
                autoSaveProjectFile: get(autoSaveProjectFileAtom),
            });
        },
        jotaiDefaultStore);
}

const autoSaveProjectFileAtom = atom((get) => get(userSettingsAtom).autoSaveProjectFile);

//---------------------------------------------------------------------------

interface SaveOperation {
    cutSegments: StateSegment[];
    projectFileSavePath: string;
    filePath: string | undefined;
    autoSaveProjectFile: boolean;
}

let lastSaveOperation: SaveOperation | undefined;

async function save(operation: SaveOperation | undefined) {
    try {
        if (!operation?.autoSaveProjectFile
            || operation.filePath == null
            // Don't create llc file if no segments yet
            || operation.cutSegments.length === 0
            // or if initial segment (and not deselected): https://github.com/mifi/lossless-cut/issues/2745#issuecomment-3979480707
            || (operation.cutSegments[0]?.initial && operation.cutSegments[0].selected)
        ) {
            return;
        }

        if (lastSaveOperation && lastSaveOperation.projectFileSavePath === operation.projectFileSavePath && isEqual(mapSaveableSegments(lastSaveOperation.cutSegments), mapSaveableSegments(operation.cutSegments))) {
            console.log('Segments unchanged, skipping save');
            return;
        }

        console.log('Saving project file', operation.projectFileSavePath, operation.cutSegments);
        await saveLlcProject({ savePath: operation.projectFileSavePath, mediaFilePath: operation.filePath, cutSegments: operation.cutSegments });
        lastSaveOperation = operation;
    } catch (err) {
        errorToast(i18n.t('Unable to save project file'));
        console.error('Failed to save project file', err);
    }
}

