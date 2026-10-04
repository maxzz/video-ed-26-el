import { ErrorDialog } from './error-dialog.tsx';
import { WorkingOverlay } from './working-overlay.tsx';

/** Global overlays of the file/player features (working indicator, error dialog) */
export function FileHosts() {
    return (<>
        <WorkingOverlay />
        <ErrorDialog />
    </>);
}
