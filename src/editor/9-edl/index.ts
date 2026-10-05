// Public API of the project import/export feature.
import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import type { EdlExportType, EdlImportType } from '@/editor/0-core/8-lib/types.ts';
import { exportYouTube, importEdlFile, tryExportEdlFile } from './7-actions/edl-actions.ts';

export { loadEdlFile, importEdlFile, tryExportEdlFile, exportYouTube } from './7-actions/edl-actions.ts';

function register() {
    registerActions({
        importEdlFile: (type: EdlImportType) => importEdlFile(type),
        exportEdlFile: (type: EdlExportType | 'youtube') => tryExportEdlFile(type),
        exportYouTube,
    });
}

export { register as "9-edl-register" };
