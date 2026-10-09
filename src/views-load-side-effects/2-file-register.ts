import { registerActions } from "@/editor/0-core/7-actions/kbd-actions";
import { mainApi } from "@/editor/0-core/7-actions/0-main-api";
import { openFilesActionArgsSchema } from "@/editor/0-core/8-lib/9-types-core";
import { onAppReady } from "@/editor/0-core/7-actions/2-lifecycle";
import {
    askStartTimeOffset, tmcmd_closeFileWithConfirm, makeCursorTimeZero, openSendReportDialogWithState, reloadFile, tmcmd_tryFixInvalidDuration,
} from "@/editor/2-file/7-actions/load-media";
import { tmcmd_openDirDialog, openFiles, tmcmd_openFilesDialog, tmcmd_promptDownloadMediaUrlWrapper } from "@/editor/2-file/7-actions/open-files";
import { batchFileJump, batchOpenSelectedFile, tmcmd_closeBatch } from "@/editor/2-file/7-actions/batch-actions";
import { convertFormatBatch, tmcmd_userHtml5ifyCurrentFile } from "@/editor/2-file/7-actions/html5ify";
import { initFileEffects } from "@/editor/2-file/7-actions/file-effects";

export function register_2_file() {
    registerActions({
        openFiles: async (...args: unknown[]) => openFiles(...openFilesActionArgsSchema.parse(args)),
        openFilesDialog: tmcmd_openFilesDialog,
        openDirDialog: tmcmd_openDirDialog,
        promptDownloadMediaUrl: tmcmd_promptDownloadMediaUrlWrapper,
        closeCurrentFile: () => { tmcmd_closeFileWithConfirm(); },
        closeBatch: tmcmd_closeBatch,
        batchPreviousFile: () => batchFileJump(-1, false),
        batchNextFile: () => batchFileJump(1, false),
        batchOpenPreviousFile: () => batchFileJump(-1, true),
        batchOpenNextFile: () => batchFileJump(1, true),
        batchOpenSelectedFile,
        convertFormatCurrentFile: () => tmcmd_userHtml5ifyCurrentFile(),
        html5ify: () => tmcmd_userHtml5ifyCurrentFile({ ignoreRememberedValue: true }),
        convertFormatBatch,
        setStartTimeOffset: askStartTimeOffset,
        makeCursorTimeZero,
        reloadFile,
        fixInvalidDuration: tmcmd_tryFixInvalidDuration,
        openSendReportDialog: (err?: unknown) => { openSendReportDialogWithState(err); },
        quit: () => mainApi.quitApp(),
    });

    onAppReady(initFileEffects);
}
