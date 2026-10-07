import { Dialog_ShowError } from "./dlg-show-error";
import { Dialog_WorkingOverlay } from "./dlg-working-overlay";

/** Global overlays of the file/player features (working indicator, error dialog) */
export function FileHosts() {
    return (<>
        <Dialog_WorkingOverlay />
        <Dialog_ShowError />
    </>);
}
