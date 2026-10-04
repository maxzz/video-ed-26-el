import { KeyboardShortcutsDialog } from './keyboard-shortcuts-dialog.tsx';
import { CreateBindingDialog } from './create-binding-dialog.tsx';
import { CommandPalette } from './command-palette.tsx';

/** Global overlays of the keyboard feature (shortcuts editor, command palette) */
export function KeyboardHosts() {
    return (<>
        <KeyboardShortcutsDialog />
        <CreateBindingDialog />
        <CommandPalette />
    </>);
}
