import { StreamsSelector } from '@/editor/6-streams/index.ts';
import { ExportConfirm } from './export-confirm.tsx';
import { LastCommands } from './last-commands.tsx';

/** Global overlays of the export/streams features (export confirm, streams editor, last commands) */
export function ExportHosts() {
    return (<>
        <ExportConfirm />
        <StreamsSelector />
        <LastCommands />
    </>);
}
