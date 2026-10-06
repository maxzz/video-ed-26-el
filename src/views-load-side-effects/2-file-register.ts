import { registerActions } from "@/editor/0-core/7-actions/kbd-actions";
import { mainApi } from "@/editor/0-core/7-actions/0-main-api";
import { openFilesActionArgsSchema } from "@/editor/0-core/8-lib/9-types-core";
import { onAppReady } from "@/editor/0-core/7-actions/2-lifecycle";
import {
    askStartTimeOffset, closeFileWithConfirm, makeCursorTimeZero, openSendReportDialogWithState, reloadFile, tryFixInvalidDuration,
} from "@/editor/2-file/7-actions/load-media";
import { openDirDialog, openFiles, openFilesDialog, promptDownloadMediaUrlWrapper } from "@/editor/2-file/7-actions/open-files";
import { batchFileJump, batchOpenSelectedFile, closeBatch } from "@/editor/2-file/7-actions/batch-actions";
import { convertFormatBatch, userHtml5ifyCurrentFile } from "@/editor/2-file/7-actions/html5ify";
import { initFileEffects } from "@/editor/2-file/7-actions/file-effects";

export function register_2_file() {
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
