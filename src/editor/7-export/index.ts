// Owner: 7-export + 6-streams port. Public API of the export feature.
import { registerActions } from '@/editor/0-core/1-actions/actions-registry.ts';
import { toggleLastCommands } from '@/editor/1-layout/0-state/panels-atoms.ts';
import {
    cleanupFilesDialog, copySegmentsToClipboard, extractAllStreams, onExportPress, toggleKeyframeCut, tryDecimate,
} from './1-actions/export-actions.ts';

export { ExportHosts } from './3-ui/export-hosts.tsx';
export * as ffmpegOperations from './2-lib/ffmpeg-operations.ts';
export { appendFfmpegCommandLog, appendLastCommandsLog } from './0-state/export-atoms.ts';
export {
    onExportPress, onExportConfirm, cleanupFiles, cleanupFilesDialog, askForCleanupChoices, extractAllStreams, extractSingleStream, changeOutDir, setOutputDir,
    increaseExportCount, toggleKeyframeCut, toggleSafeOutputFileName, tryFixInvalidDuration, tryDecimate, copySegmentsToClipboard, handleExportFailed, handleFfmpegFailure,
    onOutputFormatUserChange, setExportMode,
} from './1-actions/export-actions.ts';
export { generateOutSegFileNames, generateCutMergedOutFileNames, generateMergedOutFileNames } from './1-actions/out-file-names.ts';
export { openExportFinishedDialog, openCutFinishedDialog, openConcatFinishedDialog, openCleanupFilesDialog, openDecimateDialog } from './3-ui/finished-dialogs.tsx';
export { ExportButton, ExportModeButton, ToggleExportConfirm } from './3-ui/export-buttons.tsx';
export { OutputFormatSelect, CurrentFileOutputFormatSelect } from './3-ui/output-format-select.tsx';
export { OutDirSelector } from './3-ui/out-dir-selector.tsx';
export { FileNameTemplateEditor } from './3-ui/file-name-template-editor.tsx';
export { CopyClipboardButton } from './3-ui/controls.tsx';
export { TopMenu } from './3-ui/top-menu/top-menu.tsx';

registerActions({
    export: onExportPress,
    toggleLastCommands,
    cleanupFilesDialog,
    extractAllStreams,
    toggleKeyframeCutMode: () => toggleKeyframeCut(true),
    decimate: tryDecimate,
    copySegmentsToClipboard,
});
