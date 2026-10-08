import { Dialog_KeyboardShortcuts } from "./dlg-keyboard-shortcuts";
import { Dialog_CreateKbdBinding } from "./dlg-create-kbd-binding";
import { Dialog_CommandPalette } from "./1-command-palette";

/** Global overlays of the keyboard feature (shortcuts editor, command palette) */
export function KeyboardHosts() {
    return (<>
        <Dialog_KeyboardShortcuts />
        <Dialog_CreateKbdBinding />
        <Dialog_CommandPalette />
    </>);
}
