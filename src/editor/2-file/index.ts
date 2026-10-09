// Public API of the file feature (open, close, load media, batch, html5ify, project auto-save).
export {
    loadMedia, userOpenSingleFile, closeFile, tmcmd_closeFileWithConfirm as closeFileWithConfirm, runAndReloadFile, reloadFile,
    askStartTimeOffset, setStartTimeOffset, makeCursorTimeZero, openSendReportDialogWithState, isFileDurationValid, tmcmd_tryFixInvalidDuration as tryFixInvalidDuration,
    showNotification, showNotNativelySupportedMessage, showPreviewFileLoadedMessage,
} from "./7-actions/load-media";
export {
    userOpenFiles, openFiles, tmcmd_openFilesDialog as openFilesDialog, tmcmd_openDirDialog as openDirDialog, tmcmd_promptDownloadMediaUrlWrapper as promptDownloadMediaUrlWrapper,
    onFilesDrop, handleStreamSourceFileDrop,
} from "./7-actions/open-files";
export {
    batchLoadPaths, addFileToBatch, batchOpenSingleFile, batchFileJump, batchOpenSelectedFile, onBatchFileSelect, tmcmd_closeBatch as closeBatch,
    batchListRemoveFile, handleBatchFilesDrop, setBatchFiles, setSelectedBatchFiles,
} from "./7-actions/batch-actions";
export { html5ifyAndLoadWithPreferences, tmcmd_userHtml5ifyCurrentFile as userHtml5ifyCurrentFile, convertFormatBatch } from "./7-actions/html5ify";
export { ensureWritableOutDir, ensureAccessToSourceDir } from "./7-actions/directory-access";
export { getEdlFilePath, getProjectFileSavePath, projectFileSavePathAtom } from "./7-actions/project-auto-save";
export { runStartupCheck } from "./7-actions/startup-check";
export { dialog_SendReport_open as openSendReportDialog } from "./0-ui/dlg-send-report";

