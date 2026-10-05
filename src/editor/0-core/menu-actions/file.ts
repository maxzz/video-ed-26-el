import type { EdlExportType, EdlImportType } from '@/editor/0-core/8-lib/9-types-core';
import { toggleSettings as toggleSettingsPanel } from '@/components/2-main/0-all/a-panels-atoms';
import { closeBatch as closeBatchImpl } from '@/editor/2-file/7-actions/batch-actions.ts';
import { userHtml5ifyCurrentFile } from '@/editor/2-file/7-actions/html5ify.ts';
import { closeFileWithConfirm, tryFixInvalidDuration } from '@/editor/2-file/7-actions/load-media.ts';
import { openDirDialog as openDirDialogImpl, openFilesDialog as openFilesDialogImpl, promptDownloadMediaUrlWrapper } from '@/editor/2-file/7-actions/open-files.ts';
import { tryDecimate } from '@/editor/7-export/7-actions/export-actions.ts';
import { exportYouTube as exportYouTubeImpl, importEdlFile as importEdlFileImpl, tryExportEdlFile } from '@/editor/9-edl/7-actions/edl-actions.ts';

export function openFilesDialog() {
    return openFilesDialogImpl();
}

export function openDirDialog() {
    return openDirDialogImpl();
}

export function promptDownloadMediaUrl() {
    return promptDownloadMediaUrlWrapper();
}

export function closeCurrentFile() {
    return closeFileWithConfirm();
}

export function closeBatch() {
    return closeBatchImpl();
}

export function importEdlFile(format: EdlImportType) {
    return importEdlFileImpl(format);
}

export function exportEdlFile(format: EdlExportType) {
    return tryExportEdlFile(format);
}

export function exportYouTube() {
    return exportYouTubeImpl();
}

export function html5ify() {
    return userHtml5ifyCurrentFile({ ignoreRememberedValue: true });
}

export function fixInvalidDuration() {
    return tryFixInvalidDuration();
}

export function decimate() {
    return tryDecimate();
}

export function toggleSettings() {
    toggleSettingsPanel();
}
