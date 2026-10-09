import i18n from "i18next";
import invariant from "tiny-invariant";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";

import { mainApi } from "@/editor/0-core/7-actions/0-main-api";
import { customOutDirAtom, userSettings } from "@/editor/0-core/9-state/user-settings";
import { isWorking, setWorking, withErrorHandling } from "@/editor/0-core/9-state/working";
import { show_ErrorToast, dialog_PromptDownloadMediaUrl } from "@/components/4-dialogs/7-1-dialogs/00-app-dialogs";

import { showDialog_Open } from "@/components/4-dialogs/7-1-dialogs/01-show-open-dialog";
import { askDialog_ForFileOpenAction, type OpenFileResponse } from "@/components/4-dialogs/7-1-dialogs/04-ask-for-file-open-action";
import { basename, fs } from "@/editor/0-core/8-lib/node-shims";
import { getDownloadMediaOutPath, getImportProjectType, readDirRecursively, readVideoTs, resolvePathIfNeeded } from "@/editor/0-core/8-lib/util";
import { concatDialogOpenAtom, streamsSelectorShownAtom } from "@/components/2-main/0-all/a-panels-atoms";
import { checkFileOpened } from "@/editor/3-player/7-actions/player-actions";
import { loadEdlFile } from "@/editor/9-edl/7-actions/edl-actions";
import { alwaysConcatMultipleFilesAtom, batchFilesAtom, filePathAtom, isFileOpenedAtom, lastOpenedPathAtom } from "../9-state/a-file-atoms";
import { getDroppedFilePaths } from "../../../utils/local-utils/8-drop-full-path";
import { batchLoadPaths } from "./batch-actions";
import { ensureWritableOutDir } from "./directory-access";
import { addStreamSourceFile } from "@/editor/6-streams/7-actions/streams-actions";
import { loadMedia, userOpenSingleFile } from "./load-media";

export async function userOpenFiles(newFilePathsIn?: string[]) {
    await withErrorHandling(async () => {
        let newFilePaths = newFilePathsIn;
        if (!newFilePaths || newFilePaths.length === 0) {
            return;
        }

        console.log('userOpenFiles');
        console.log(newFilePaths.join('\n'));

        jotaiDefaultStore.set(lastOpenedPathAtom, newFilePaths[0]!);

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
                show_ErrorToast(i18n.t('Cannot open anything else than regular files'));
                console.warn('Not a file:', path);
                return;
            }
        }

        if (newFilePaths.length > 1 && jotaiDefaultStore.get(alwaysConcatMultipleFilesAtom)) {
            batchLoadPaths(newFilePaths);
            jotaiDefaultStore.set(concatDialogOpenAtom, true);
            return;
        }

        firstNewFilePath = newFilePaths[0]!;
        invariant(firstNewFilePath != null);

        // https://en.wikibooks.org/wiki/Inside_DVD-Video/Directory_Structure
        if (newFilePaths.length === 1 && /^video_ts$/i.test(basename(firstNewFilePath))) {
            newFilePaths = await readVideoTs(firstNewFilePath);
        }

        if (isWorking()) {
            return;
        }
        try {
            setWorking({ text: i18n.t('Loading file') });

            // If it's a project file (not llc) and we have an already opened file, import segments from the project
            const matchingImportProjectType = getImportProjectType(firstNewFilePath);
            if (matchingImportProjectType) {
                if (!checkFileOpened()) {
                    return;
                }
                await loadEdlFile({ path: firstNewFilePath, type: matchingImportProjectType, append: true });
                return;
            }

            const filePathLowerCase = firstNewFilePath.toLowerCase();
            const isLlcProject = filePathLowerCase.endsWith('.llc');
            const isFileOpened = jotaiDefaultStore.get(isFileOpenedAtom);

            // Need to ask the user what to do if more than one option
            const inputOptions: Partial<Record<OpenFileResponse, string>> = {};

            if (newFilePaths.length === 1) {
                inputOptions.open = isFileOpened ? i18n.t('Open the file instead of the current one') : i18n.t('Open the file');
            }

            if (isFileOpened && newFilePaths.length === 1) {
                if (isLlcProject) {
                    inputOptions.project = i18n.t('Load segments from the new file, but keep the current media');
                }
                else if (filePathLowerCase.endsWith('.srt')) {
                    inputOptions.subtitles = i18n.t('Convert subtitiles into segments');
                }
                inputOptions.tracks = i18n.t('Include all tracks from the new file');
            }

            if (isFileOpened) {
                inputOptions.mergeWithCurrentFile = i18n.t('Merge/concatenate with current file');
            }
            if (jotaiDefaultStore.get(batchFilesAtom).length > 0 || newFilePaths.length > 1) {
                inputOptions.addToBatch = i18n.t('Add the file to the batch list');
            }

            const inputOptionsKeys = Object.keys(inputOptions) as OpenFileResponse[];
            const { enableAskForFileOpenAction } = userSettings;

            let openFileResponse: OpenFileResponse | undefined;
            if (inputOptionsKeys.length === 1) {
                [openFileResponse] = inputOptionsKeys;
            }
            if (!enableAskForFileOpenAction && inputOptionsKeys.length > 1) {
                openFileResponse = 'addToBatch';
            }
            if (enableAskForFileOpenAction && inputOptionsKeys.length > 1) {
                openFileResponse = await askDialog_ForFileOpenAction(Object.entries(inputOptions) as [OpenFileResponse, string][]);
            }
            else if (newFilePaths.length === 1) {
                openFileResponse = 'open';
            }

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
                jotaiDefaultStore.set(streamsSelectorShownAtom, true);
                return;
            }
            if (openFileResponse === 'addToBatch') {
                batchLoadPaths(newFilePaths, true);
                return;
            }
            if (openFileResponse === 'mergeWithCurrentFile') {
                const batchPaths = new Set<string>();
                const filePath = jotaiDefaultStore.get(filePathAtom);
                if (filePath) batchPaths.add(filePath);
                newFilePaths.forEach((path) => batchPaths.add(path));
                batchLoadPaths([...batchPaths]);
                if (batchPaths.size > 1) jotaiDefaultStore.set(concatDialogOpenAtom, true);
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

export async function tmcmd_file_openFilesDialog() {
    // On Windows and Linux an open dialog can not be both a file selector and a directory selector, so if you set `properties` to `['openFile', 'openDirectory']` on these platforms, a directory selector will be shown. #1995
    const lastOpenedPath = jotaiDefaultStore.get(lastOpenedPathAtom);
    const { canceled, filePaths } = await showDialog_Open({ properties: ['openFile', 'multiSelections'], ...(lastOpenedPath != null && { defaultPath: lastOpenedPath }), title: i18n.t('Open file') });
    if (canceled) {
        return;
    }
    await userOpenFiles(filePaths);
}

export async function tmcmd_file_openDirDialog() {
    const lastOpenedPath = jotaiDefaultStore.get(lastOpenedPathAtom);
    const { canceled, filePaths } = await showDialog_Open({ properties: ['openDirectory', 'multiSelections'], ...(lastOpenedPath != null && { defaultPath: lastOpenedPath }), title: i18n.t('Open folder') });
    if (canceled) {
        return;
    }
    await userOpenFiles(filePaths);
}

export async function tmcmd_file_promptDownloadMediaUrlWrapper() {
    try {
        setWorking({ text: i18n.t('Downloading URL') });
        await withErrorHandling(async () => {
            const newCustomOutDir = await ensureWritableOutDir({ outDir: jotaiDefaultStore.get(customOutDirAtom) });
            if (newCustomOutDir == null) {
                show_ErrorToast(i18n.t('Please select a working directory first'));
                return;
            }
            const outPath = getDownloadMediaOutPath(newCustomOutDir, `downloaded-media-${Date.now()}.mkv`);
            const downloaded = await dialog_PromptDownloadMediaUrl(outPath);
            if (downloaded) {
                await loadMedia({ filePath: outPath });
            }
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
    if (filePaths.length === 0) {
        return;
    }
    await mainApi.focusWindow();
    await userOpenFiles(filePaths);
}

/** onDrop of the tracks editor: include all tracks from one dropped file */
export async function handleStreamSourceFileDrop(ev: DropEventLike) {
    ev.preventDefault();
    await withErrorHandling(async () => {
        const filePaths = getDroppedFilePaths(ev.dataTransfer);
        if (filePaths.length !== 1) {
            return;
        }
        await mainApi.focusWindow();
        await addStreamSourceFile(filePaths[0]!);
    });
}
