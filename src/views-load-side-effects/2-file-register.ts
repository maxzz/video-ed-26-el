import { registerActions } from "@/editor/0-core/7-actions/kbd-actions";
import { mainApi } from "@/editor/0-core/7-actions/0-main-api";
import { openFilesActionArgsSchema } from "@/editor/0-core/8-lib/9-types-core";
import { onAppReady } from "@/editor/0-core/7-actions/2-lifecycle";
import {
    tmcmd_tools_askStartTimeOffset, tmcmd_file_closeFileWithConfirm, makeCursorTimeZero, tmcmd_help_openSendReportDialogWithState, reloadFile, tmcmd_file_tryFixInvalidDuration,
} from "@/editor/2-file/7-actions/load-media";
import { tmcmd_file_openDirDialog, openFiles, tmcmd_file_openFilesDialog, tmcmd_file_promptDownloadMediaUrlWrapper } from "@/editor/2-file/7-actions/open-files";
import { batchFileJump, batchOpenSelectedFile, tmcmd_file_closeBatch } from "@/editor/2-file/7-actions/batch-actions";
import { convertFormatBatch, tmcmd_file_userHtml5ifyCurrentFile } from "@/editor/2-file/7-actions/html5ify";
import { initFileEffects } from "@/editor/2-file/7-actions/file-effects";

export function register_2_file() {
    registerActions({
        openFiles: async (...args: unknown[]) => openFiles(...openFilesActionArgsSchema.parse(args)),
        openFilesDialog: tmcmd_file_openFilesDialog,
        openDirDialog: tmcmd_file_openDirDialog,
        promptDownloadMediaUrl: tmcmd_file_promptDownloadMediaUrlWrapper,
        closeCurrentFile: () => { tmcmd_file_closeFileWithConfirm(); },
        closeBatch: tmcmd_file_closeBatch,
        batchPreviousFile: () => batchFileJump(-1, false),
        batchNextFile: () => batchFileJump(1, false),
        batchOpenPreviousFile: () => batchFileJump(-1, true),
        batchOpenNextFile: () => batchFileJump(1, true),
        batchOpenSelectedFile,
        convertFormatCurrentFile: () => tmcmd_file_userHtml5ifyCurrentFile(),
        html5ify: () => tmcmd_file_userHtml5ifyCurrentFile({ ignoreRememberedValue: true }),
        convertFormatBatch,
        setStartTimeOffset: tmcmd_tools_askStartTimeOffset,
        makeCursorTimeZero,
        reloadFile,
        fixInvalidDuration: tmcmd_file_tryFixInvalidDuration,
        openSendReportDialog: (err?: unknown) => { tmcmd_help_openSendReportDialogWithState(err); },
        quit: () => mainApi.quitApp(),
    });

    onAppReady(initFileEffects);
}
