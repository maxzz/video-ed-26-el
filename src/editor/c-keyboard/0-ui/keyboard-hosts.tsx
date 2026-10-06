import { KeyboardShortcutsDialog } from "./keyboard-shortcuts-dialog";
import { CreateBindingDialog } from "./create-binding-dialog";
import { CommandPalette } from "./command-palette";

/** Global overlays of the keyboard feature (shortcuts editor, command palette) */
export function KeyboardHosts() {
    return (<>
        <KeyboardShortcutsDialog />
        <CreateBindingDialog />
        <CommandPalette />
    </>);
}
