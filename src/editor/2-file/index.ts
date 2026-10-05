// Public API of the file feature (open, close, load media, batch, html5ify, project auto-save).
export {
    loadMedia, userOpenSingleFile, closeFile, closeFileWithConfirm, runAndReloadFile, reloadFile,
    askStartTimeOffset, setStartTimeOffset, makeCursorTimeZero, openSendReportDialogWithState, isFileDurationValid, tryFixInvalidDuration,
    showNotification, showNotNativelySupportedMessage, showPreviewFileLoadedMessage,
} from './7-actions/load-media.ts';
export {
    userOpenFiles, openFiles, openFilesDialog, openDirDialog, promptDownloadMediaUrlWrapper,
    onFilesDrop, handleStreamSourceFileDrop,
} from './7-actions/open-files.ts';
export {
    batchLoadPaths, addFileToBatch, batchOpenSingleFile, batchFileJump, batchOpenSelectedFile, onBatchFileSelect, closeBatch,
    batchListRemoveFile, handleBatchFilesDrop, setBatchFiles, setSelectedBatchFiles,
} from './7-actions/batch-actions.ts';
export { html5ifyAndLoadWithPreferences, userHtml5ifyCurrentFile, convertFormatBatch } from './7-actions/html5ify.ts';
export { ensureWritableOutDir, ensureAccessToSourceDir } from './7-actions/directory-access.ts';
export { getEdlFilePath, getProjectFileSavePath, projectFileSavePathAtom } from './7-actions/project-auto-save.ts';
export { runStartupCheck } from './7-actions/startup-check.ts';
export { openSendReportDialog } from './0-ui/send-report-dialog.tsx';
export { askForHtml5ifySpeed } from './0-ui/html5ify-dialog.tsx';
export { getDroppedFilePaths } from './8-lib/drop.ts';
