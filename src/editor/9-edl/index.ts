// Public API of the project import/export feature.
import { registerActions } from '@/editor/0-core/1-actions/actions-registry.ts';
import type { EdlExportType, EdlImportType } from '@/editor/0-core/2-lib/types.ts';
import { exportYouTube, importEdlFile, tryExportEdlFile } from './1-actions/edl-actions.ts';

export { loadEdlFile, importEdlFile, tryExportEdlFile, exportYouTube } from './1-actions/edl-actions.ts';

registerActions({
    importEdlFile: (type: EdlImportType) => importEdlFile(type),
    exportEdlFile: (type: EdlExportType | 'youtube') => tryExportEdlFile(type),
    exportYouTube,
});
