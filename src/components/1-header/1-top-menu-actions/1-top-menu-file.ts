import { type EdlExportType, type EdlImportType } from "@/editor/0-core/8-lib/9-types-core";
import { tmcmd_toggleSettings } from "@/components/2-main/0-all/a-panels-atoms";
import { tmcmd_closeBatch } from "@/editor/2-file/7-actions/batch-actions";
import { tmcmd_userHtml5ifyCurrentFile } from "@/editor/2-file/7-actions/html5ify";
import { tmcmd_closeFileWithConfirm, tmcmd_tryFixInvalidDuration } from "@/editor/2-file/7-actions/load-media";
import { tmcmd_openDirDialog, tmcmd_openFilesDialog, tmcmd_promptDownloadMediaUrlWrapper } from "@/editor/2-file/7-actions/open-files";
import { tmcmd_tryDecimate } from "@/editor/7-export/7-actions/export-actions";
import { tmcmd_exportYouTube, tmcmd_importEdlFile, tmcmd_tryExportEdlFile } from "@/editor/9-edl/7-actions/edl-actions";

export function openFilesDialog() {
    return tmcmd_openFilesDialog();
}

export function openDirDialog() {
    return tmcmd_openDirDialog();
}

export function promptDownloadMediaUrl() {
    return tmcmd_promptDownloadMediaUrlWrapper();
}

export function closeCurrentFile() {
    return tmcmd_closeFileWithConfirm();
}

export function closeBatch() {
    return tmcmd_closeBatch();
}

export function importEdlFile(format: EdlImportType) {
    return tmcmd_importEdlFile(format);
}

export function exportEdlFile(format: EdlExportType) {
    return tmcmd_tryExportEdlFile(format);
}

export function exportYouTube() {
    return tmcmd_exportYouTube();
}

export function html5ify() {
    return tmcmd_userHtml5ifyCurrentFile({ ignoreRememberedValue: true });
}

export function fixInvalidDuration() {
    return tmcmd_tryFixInvalidDuration();
}

export function decimate() {
    return tmcmd_tryDecimate();
}

export function toggleSettings() {
    tmcmd_toggleSettings();
}
