import i18n from 'i18next';
import invariant from 'tiny-invariant';
import { appStore } from '@/components/4-dialogs/7-0-dialogs/store.ts';
import { customOutDirAtom, userSettings } from '@/editor/0-core/9-state/user-settings.ts';
import { isWorking, setWorking, withErrorHandling } from '@/editor/0-core/9-state/working.ts';
import type { OpenFileResponse } from '@/editor/0-core/8-lib/app-dialogs.tsx';
import { askForFileOpenAction, errorToast, promptDownloadMediaUrl, showOpenDialog } from '@/editor/0-core/8-lib/app-dialogs.tsx';
import { mainApi } from '@/editor/0-core/8-lib/main-api.ts';
import { basename, fs } from '@/editor/0-core/8-lib/node-shims.ts';
import { getDownloadMediaOutPath, getImportProjectType, readDirRecursively, readVideoTs, resolvePathIfNeeded } from '@/editor/0-core/8-lib/util.ts';
import { concatDialogOpenAtom, streamsSelectorShownAtom } from '@/components/2-main/0-all/a-panels-atoms.ts';
import { checkFileOpened } from '@/editor/3-player/7-actions/player-actions.ts';
import { loadEdlFile } from '@/editor/9-edl/7-actions/edl-actions.ts';
import { alwaysConcatMultipleFilesAtom, batchFilesAtom, filePathAtom, isFileOpenedAtom, lastOpenedPathAtom } from '../9-state/a-file-atoms.ts';
import { getDroppedFilePaths } from '../../../utils/local-utils/drop-full-path.ts';
import { batchLoadPaths } from './batch-actions.ts';
import { ensureWritableOutDir } from './directory-access.ts';
import { addStreamSourceFile } from '@/editor/6-streams/7-actions/streams-actions.tsx';
import { loadMedia, userOpenSingleFile } from './load-media.ts';

export async function userOpenFiles(newFilePathsIn?: string[]) {
    await withErrorHandling(async () => {
        let newFilePaths = newFilePathsIn;
        if (!newFilePaths || newFilePaths.length === 0) return;

        console.log('userOpenFiles');
        console.log(newFilePaths.join('\n'));

        appStore.set(lastOpenedPathAtom, newFilePaths[0]!);

        let firstNewFilePath = newFilePaths[0]!;

        // first check if it is a single directory, and if so, read it recursively
        if (newFilePaths.length === 1 && (await fs.lstat(firstNewFilePath)).isDirectory()) {
            console.log('Reading directory...');
            newFilePaths = await readDirRecursively(firstNewFilePath);
        }

        // Only allow opening regular files
        for (const path of newFilePaths) {
            const fileStat = await fs.lstat(path);
            if (!fileStat.isFile()) {
                errorToast(i18n.t('Cannot open anything else than regular files'));
                console.warn('Not a file:', path);
                return;
            }
        }

        if (newFilePaths.length > 1 && appStore.get(alwaysConcatMultipleFilesAtom)) {
            batchLoadPaths(newFilePaths);
            appStore.set(concatDialogOpenAtom, true);
            return;
        }

        firstNewFilePath = newFilePaths[0]!;
        invariant(firstNewFilePath != null);

        // https://en.wikibooks.org/wiki/Inside_DVD-Video/Directory_Structure
        if (newFilePaths.length === 1 && /^video_ts$/i.test(basename(firstNewFilePath))) {
            newFilePaths = await readVideoTs(firstNewFilePath);
        }

        if (isWorking()) return;
        try {
            setWorking({ text: i18n.t('Loading file') });

            // If it's a project file (not llc) and we have an already opened file, import segments from the project
            const matchingImportProjectType = getImportProjectType(firstNewFilePath);
            if (matchingImportProjectType) {
                if (!checkFileOpened()) return;
                await loadEdlFile({ path: firstNewFilePath, type: matchingImportProjectType, append: true });
                return;
            }

            const filePathLowerCase = firstNewFilePath.toLowerCase();
            const isLlcProject = filePathLowerCase.endsWith('.llc');
            const isFileOpened = appStore.get(isFileOpenedAtom);

            // Need to ask the user what to do if more than one option
            const inputOptions: Partial<Record<OpenFileResponse, string>> = {};

            if (newFilePaths.length === 1) {
                inputOptions.open = isFileOpened ? i18n.t('Open the file instead of the current one') : i18n.t('Open the file');
            }

            if (isFileOpened && newFilePaths.length === 1) {
                if (isLlcProject) inputOptions.project = i18n.t('Load segments from the new file, but keep the current media');
                else if (filePathLowerCase.endsWith('.srt')) inputOptions.subtitles = i18n.t('Convert subtitiles into segments');
                inputOptions.tracks = i18n.t('Include all tracks from the new file');
            }

            if (isFileOpened) inputOptions.mergeWithCurrentFile = i18n.t('Merge/concatenate with current file');
            if (appStore.get(batchFilesAtom).length > 0 || newFilePaths.length > 1) inputOptions.addToBatch = i18n.t('Add the file to the batch list');

            const inputOptionsKeys = Object.keys(inputOptions) as OpenFileResponse[];
            const { enableAskForFileOpenAction } = userSettings;

            let openFileResponse: OpenFileResponse | undefined;
            if (inputOptionsKeys.length === 1) [openFileResponse] = inputOptionsKeys;
            if (!enableAskForFileOpenAction && inputOptionsKeys.length > 1) openFileResponse = 'addToBatch';
            if (enableAskForFileOpenAction && inputOptionsKeys.length > 1) openFileResponse = await askForFileOpenAction(Object.entries(inputOptions) as [OpenFileResponse, string][]);
            else if (newFilePaths.length === 1) openFileResponse = 'open';

            if (openFileResponse === 'open') {
                await userOpenSingleFile({ path: firstNewFilePath, isLlcProject });
                return;
            }
            if (openFileResponse === 'project') {
                await loadEdlFile({ path: firstNewFilePath, type: 'llc' });
                return;
            }
            if (openFileResponse === 'subtitles') {
                await loadEdlFile({ path: firstNewFilePath, type: 'srt' });
                return;
            }
            if (openFileResponse === 'tracks') {
                await addStreamSourceFile(firstNewFilePath);
                appStore.set(streamsSelectorShownAtom, true);
                return;
            }
            if (openFileResponse === 'addToBatch') {
                batchLoadPaths(newFilePaths, true);
                return;
            }
            if (openFileResponse === 'mergeWithCurrentFile') {
                const batchPaths = new Set<string>();
                const filePath = appStore.get(filePathAtom);
                if (filePath) batchPaths.add(filePath);
                newFilePaths.forEach((path) => batchPaths.add(path));
                batchLoadPaths([...batchPaths]);
                if (batchPaths.size > 1) appStore.set(concatDialogOpenAtom, true);
            }
            // else: no match means dialog canceled or nothing useful to do:
        } finally {
            setWorking(undefined);
        }
    }, i18n.t('Failed to open file'));
}

/** `openFiles` action: paths from the command line, a second instance, macOS open-file or the HTTP API */
export async function openFiles(filePaths: string[]) {
    await userOpenFiles(filePaths.map((p) => resolvePathIfNeeded(p)));
}

export async function openFilesDialog() {
    // On Windows and Linux an open dialog can not be both a file selector and a directory selector, so if you set `properties` to `['openFile', 'openDirectory']` on these platforms, a directory selector will be shown. #1995
    const lastOpenedPath = appStore.get(lastOpenedPathAtom);
    const { canceled, filePaths } = await showOpenDialog({ properties: ['openFile', 'multiSelections'], ...(lastOpenedPath != null && { defaultPath: lastOpenedPath }), title: i18n.t('Open file') });
    if (canceled) return;
    await userOpenFiles(filePaths);
}

export async function openDirDialog() {
    const lastOpenedPath = appStore.get(lastOpenedPathAtom);
    const { canceled, filePaths } = await showOpenDialog({ properties: ['openDirectory', 'multiSelections'], ...(lastOpenedPath != null && { defaultPath: lastOpenedPath }), title: i18n.t('Open folder') });
    if (canceled) return;
    await userOpenFiles(filePaths);
}

export async function promptDownloadMediaUrlWrapper() {
    try {
        setWorking({ text: i18n.t('Downloading URL') });
        await withErrorHandling(async () => {
            const newCustomOutDir = await ensureWritableOutDir({ outDir: appStore.get(customOutDirAtom) });
            if (newCustomOutDir == null) {
                errorToast(i18n.t('Please select a working directory first'));
                return;
            }
            const outPath = getDownloadMediaOutPath(newCustomOutDir, `downloaded-media-${Date.now()}.mkv`);
            const downloaded = await promptDownloadMediaUrl(outPath);
            if (downloaded) await loadMedia({ filePath: outPath });
        }, i18n.t('Failed to download URL'));
    } finally {
        setWorking(undefined);
    }
}

interface DropEventLike {
    preventDefault: () => void;
    dataTransfer: DataTransfer | null;
}

/** onDrop of the player area (and the "no file loaded" drop zone) */
export async function onFilesDrop(ev: DropEventLike) {
    ev.preventDefault();
    const filePaths = getDroppedFilePaths(ev.dataTransfer);
    if (filePaths.length === 0) return;
    await mainApi.focusWindow();
    await userOpenFiles(filePaths);
}

/** onDrop of the tracks editor: include all tracks from one dropped file */
export async function handleStreamSourceFileDrop(ev: DropEventLike) {
    ev.preventDefault();
    await withErrorHandling(async () => {
        const filePaths = getDroppedFilePaths(ev.dataTransfer);
        if (filePaths.length !== 1) return;
        await mainApi.focusWindow();
        await addStreamSourceFile(filePaths[0]!);
    });
}
