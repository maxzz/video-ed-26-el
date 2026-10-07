// Public API of the file feature (open, close, load media, batch, html5ify, project auto-save).
export {
    loadMedia, userOpenSingleFile, closeFile, closeFileWithConfirm, runAndReloadFile, reloadFile,
    askStartTimeOffset, setStartTimeOffset, makeCursorTimeZero, openSendReportDialogWithState, isFileDurationValid, tryFixInvalidDuration,
    showNotification, showNotNativelySupportedMessage, showPreviewFileLoadedMessage,
} from "./7-actions/load-media";
export {
    userOpenFiles, openFiles, openFilesDialog, openDirDialog, promptDownloadMediaUrlWrapper,
    onFilesDrop, handleStreamSourceFileDrop,
} from "./7-actions/open-files";
export {
    batchLoadPaths, addFileToBatch, batchOpenSingleFile, batchFileJump, batchOpenSelectedFile, onBatchFileSelect, closeBatch,
    batchListRemoveFile, handleBatchFilesDrop, setBatchFiles, setSelectedBatchFiles,
} from "./7-actions/batch-actions";
export { html5ifyAndLoadWithPreferences, userHtml5ifyCurrentFile, convertFormatBatch } from "./7-actions/html5ify";
export { ensureWritableOutDir, ensureAccessToSourceDir } from "./7-actions/directory-access";
export { getEdlFilePath, getProjectFileSavePath, projectFileSavePathAtom } from "./7-actions/project-auto-save";
export { runStartupCheck } from "./7-actions/startup-check";
export { dialog_SendReport_open as openSendReportDialog } from "./0-ui/dlg-send-report";

