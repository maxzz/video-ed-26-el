import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { mainApi } from '@/editor/0-core/8-lib/main-api.ts';
import { openFilesActionArgsSchema } from '@/editor/0-core/8-lib/types.ts';
import { onAppReady } from '@/editor/0-core/7-actions/lifecycle.ts';
import {
    askStartTimeOffset, closeFileWithConfirm, makeCursorTimeZero, openSendReportDialogWithState, reloadFile, tryFixInvalidDuration,
} from '@/editor/2-file/7-actions/load-media.ts';
import { openDirDialog, openFiles, openFilesDialog, promptDownloadMediaUrlWrapper } from '@/editor/2-file/7-actions/open-files.ts';
import { batchFileJump, batchOpenSelectedFile, closeBatch } from '@/editor/2-file/7-actions/batch-actions.ts';
import { convertFormatBatch, userHtml5ifyCurrentFile } from '@/editor/2-file/7-actions/html5ify.ts';
import { initFileEffects } from '@/editor/2-file/7-actions/file-effects.ts';

function register() {
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
}

export { register as "2-file-register" };
