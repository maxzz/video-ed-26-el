import { registerActions } from "@/editor/0-core/7-actions/kbd-actions";
import { type EdlExportType, type EdlImportType } from "@/editor/0-core/8-lib/9-types-core";
import { exportYouTube, importEdlFile, tryExportEdlFile } from "@/editor/9-edl/7-actions/edl-actions";

export function register_9_edl() {
    registerActions({
        importEdlFile: (type: EdlImportType) => importEdlFile(type),
        exportEdlFile: (type: EdlExportType | 'youtube') => tryExportEdlFile(type),
        exportYouTube,
    });
}
