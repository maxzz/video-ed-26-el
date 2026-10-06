import { Dialog_StreamsSelector } from '@/editor/6-streams/0-ui/dlg-streams-selector';
import { Dialog_ExportConfirm } from './1-dlg-export-confirm.tsx';
import { Dialog_LastCommands } from './2-dlg-last-commands.tsx';

/** Global overlays of the export/streams features (export confirm, streams editor, last commands) */
export function ExportHosts() {
    return (<>
        <Dialog_ExportConfirm />
        <Dialog_StreamsSelector />
        <Dialog_LastCommands />
    </>);
}
