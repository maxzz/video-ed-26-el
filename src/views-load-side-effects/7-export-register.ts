import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { toggleLastCommands } from '@/editor/1-layout/9-state/panels-atoms.ts';
import { cleanupFilesDialog, copySegmentsToClipboard, extractAllStreams, onExportPress, toggleKeyframeCut, tryDecimate } from '@/editor/7-export/7-actions/export-actions.ts';

export function register_7_export() {
    registerActions({
        export: onExportPress,
        toggleLastCommands,
        cleanupFilesDialog,
        extractAllStreams,
        toggleKeyframeCutMode: () => toggleKeyframeCut(true),
        decimate: tryDecimate,
        copySegmentsToClipboard,
    });
}
