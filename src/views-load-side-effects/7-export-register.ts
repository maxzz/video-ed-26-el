import { registerActions } from "@/editor/0-core/7-actions/kbd-actions";
import { tmcmd_toggleLastCommands } from "@/components/2-main/0-all/a-panels-atoms";
import { cleanupFilesDialog, copySegmentsToClipboard, tmcmd_extractAllStreams, onExportPress, toggleKeyframeCut, tmcmd_tryDecimate } from "@/editor/7-export/7-actions/export-actions";

export function register_7_export() {
    registerActions({
        export: onExportPress,
        toggleLastCommands: tmcmd_toggleLastCommands,
        cleanupFilesDialog,
        extractAllStreams: tmcmd_extractAllStreams,
        toggleKeyframeCutMode: () => toggleKeyframeCut(true),
        decimate: tmcmd_tryDecimate,
        copySegmentsToClipboard,
    });
}
