import { registerActions } from "@/editor/0-core/7-actions/kbd-actions";
import { type EdlExportType, type EdlImportType } from "@/editor/0-core/8-lib/9-types-core";
import { tmcmd_exportYouTube, tmcmd_importEdlFile, tmcmd_tryExportEdlFile } from "@/editor/9-edl/7-actions/edl-actions";

export function register_9_edl() {
    registerActions({
        importEdlFile: (type: EdlImportType) => tmcmd_importEdlFile(type),
        exportEdlFile: (type: EdlExportType | 'youtube') => tmcmd_tryExportEdlFile(type),
        exportYouTube: tmcmd_exportYouTube,
    });
}
