import i18n from "i18next";
import invariant from "tiny-invariant";
import { type BatchFile } from "@/editor/0-core/8-lib/9-types-core";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { userSettings } from "@/editor/0-core/9-state/user-settings";
import { isWorking, setWorking, withErrorHandling } from "@/editor/0-core/9-state/working";
import { dialog_Confirm } from "@/components/4-dialogs/7-1-dialogs/00-app-dialogs";
import { mainApi } from "@/editor/0-core/7-actions/0-main-api";
import { basename } from "@/editor/0-core/8-lib/node-shims";
import { batchFilesAtom, filePathAtom, selectedBatchFilesAtom } from "../9-state/a-file-atoms";
import { getDroppedFilePaths } from "../../../utils/local-utils/8-drop-full-path";
import { userOpenSingleFile } from "./load-media";

const mapPathsToFiles = (paths: string[]): BatchFile[] => paths.map((path) => ({ path, name: basename(path) }));

export function setBatchFiles(files: BatchFile[] | ((old: BatchFile[]) => BatchFile[])) {
    jotaiDefaultStore.set(batchFilesAtom, files);
}

export function setSelectedBatchFiles(paths: string[]) {
    jotaiDefaultStore.set(selectedBatchFilesAtom, paths);
}

export function batchLoadPaths(newPaths: string[], append?: boolean) {
    const existingFiles = jotaiDefaultStore.get(batchFilesAtom);
    if (append) {
        const newUniquePaths = newPaths.filter((newPath) => !existingFiles.some(({ path: existingPath }) => newPath === existingPath));
        const [firstNewUniquePath] = newUniquePaths;
        if (firstNewUniquePath == null) return;
        setSelectedBatchFiles([firstNewUniquePath]);
        setBatchFiles([...existingFiles, ...mapPathsToFiles(newUniquePaths)]);
        return;
    }
    const [firstNewPath] = newPaths;
    invariant(firstNewPath != null);
    setSelectedBatchFiles([firstNewPath]);
    setBatchFiles(mapPathsToFiles(newPaths));
}

/** Alias kept for callers that think of it as "add to batch" */
export const addFileToBatch = (paths: string[]) => batchLoadPaths(paths, true);

export async function batchOpenSingleFile(path: string) {
    if (isWorking()) return;
    if (jotaiDefaultStore.get(filePathAtom) === path) return;
    setWorking({ text: i18n.t('Loading file') });
    try {
        await withErrorHandling(async () => {
            await userOpenSingleFile({ path });
        }, i18n.t('Failed to open file'));
    } finally {
        setWorking(undefined);
    }
}

export function batchFileJump(direction: number, alsoOpen: boolean) {
    const batchFiles = jotaiDefaultStore.get(batchFilesAtom);
    const selectedBatchFiles = jotaiDefaultStore.get(selectedBatchFilesAtom);
    if (batchFiles.length === 0) return;

    let newSelectedBatchFiles: [string];
    if (selectedBatchFiles.length === 0) {
        newSelectedBatchFiles = [batchFiles[0]!.path];
    } else {
        const selectedFilePath = selectedBatchFiles[direction > 0 ? selectedBatchFiles.length - 1 : 0];
        const pathIndex = batchFiles.findIndex(({ path }) => path === selectedFilePath);
        if (pathIndex === -1) return;
        const nextFile = batchFiles[pathIndex + direction];
        if (!nextFile) return;
        newSelectedBatchFiles = [nextFile.path];
    }

    setSelectedBatchFiles(newSelectedBatchFiles);
    if (alsoOpen) batchOpenSingleFile(newSelectedBatchFiles[0]);
}

export function batchOpenSelectedFile() {
    const [firstSelectedBatchFile] = jotaiDefaultStore.get(selectedBatchFilesAtom);
    if (firstSelectedBatchFile == null) return;
    batchOpenSingleFile(firstSelectedBatchFile);
}

/** Click on a batch list item: first click selects, second click opens */
export function onBatchFileSelect(path: string) {
    if (jotaiDefaultStore.get(selectedBatchFilesAtom).includes(path)) batchOpenSingleFile(path);
    else setSelectedBatchFiles([path]);
}

export async function tmcmd_closeBatch() {
    if (userSettings.askBeforeClose && !(await dialog_Confirm({ description: i18n.t('Are you sure you want to close the loaded batch of files?') }))) return;
    setBatchFiles([]);
    setSelectedBatchFiles([]);
}

export function batchListRemoveFile(path: string | undefined) {
    const existingBatch = jotaiDefaultStore.get(batchFilesAtom);
    const index = existingBatch.findIndex((existingFile) => existingFile.path === path);
    if (index === -1) return;
    const newBatch = [...existingBatch];
    newBatch.splice(index, 1);
    const newItemAtIndex = newBatch[index];
    if (newItemAtIndex != null) setSelectedBatchFiles([newItemAtIndex.path]);
    else if (newBatch.length > 0) setSelectedBatchFiles([newBatch[0]!.path]);
    else setSelectedBatchFiles([]);
    setBatchFiles(newBatch);
}

/** onDrop handler for the batch file list */
export async function handleBatchFilesDrop(ev: { preventDefault: () => void; dataTransfer: DataTransfer | null; }) {
    ev.preventDefault();
    const filePaths = getDroppedFilePaths(ev.dataTransfer);
    if (filePaths.length === 0) return;
    await withErrorHandling(async () => {
        await mainApi.focusWindow();
        batchLoadPaths(filePaths, true);
    });
}
