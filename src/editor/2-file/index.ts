// Public API of the file feature (open, close, load media, batch, html5ify, project auto-save).
import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { mainApi } from '@/editor/0-core/8-lib/main-api.ts';
import { openFilesActionArgsSchema } from '@/editor/0-core/8-lib/types.ts';
import {
    askStartTimeOffset, closeFileWithConfirm, makeCursorTimeZero, openSendReportDialogWithState, reloadFile, tryFixInvalidDuration,
} from './7-actions/load-media.ts';
import { openDirDialog, openFiles, openFilesDialog, promptDownloadMediaUrlWrapper } from './7-actions/open-files.ts';
import { batchFileJump, batchOpenSelectedFile, closeBatch } from './7-actions/batch-actions.ts';
import { convertFormatBatch, userHtml5ifyCurrentFile } from './7-actions/html5ify.ts';
import { onAppReady } from '@/editor/0-core/7-actions/lifecycle.ts';
import { initFileEffects } from './7-actions/file-effects.ts';

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

registerActions({
    openFiles: async (...args: unknown[]) => openFiles(...openFilesActionArgsSchema.parse(args)),
    openFilesDialog,
    openDirDialog,
    promptDownloadMediaUrl: promptDownloadMediaUrlWrapper,
    closeCurrentFile: () => { closeFileWithConfirm(); },
    closeBatch,
    batchPreviousFile: () => batchFileJump(-1, false),
    batchNextFile: () => batchFileJump(1, false),
    batchOpenPreviousFile: () => batchFileJump(-1, true),
    batchOpenNextFile: () => batchFileJump(1, true),
    batchOpenSelectedFile,
    convertFormatCurrentFile: () => userHtml5ifyCurrentFile(),
    html5ify: () => userHtml5ifyCurrentFile({ ignoreRememberedValue: true }),
    convertFormatBatch,
    setStartTimeOffset: askStartTimeOffset,
    makeCursorTimeZero,
    reloadFile,
    fixInvalidDuration: tryFixInvalidDuration,
    openSendReportDialog: (err?: unknown) => { openSendReportDialogWithState(err); },
    quit: () => mainApi.quitApp(),
});

onAppReady(initFileEffects);
