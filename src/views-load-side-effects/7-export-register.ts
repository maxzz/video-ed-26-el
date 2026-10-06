import { registerActions } from "@/editor/0-core/7-actions/kbd-actions";
import { toggleLastCommands } from "@/components/2-main/0-all/a-panels-atoms";
import { cleanupFilesDialog, copySegmentsToClipboard, extractAllStreams, onExportPress, toggleKeyframeCut, tryDecimate } from "@/editor/7-export/7-actions/export-actions";

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
