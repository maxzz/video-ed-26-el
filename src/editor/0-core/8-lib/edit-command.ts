export type EditCommand = 'cut' | 'copy' | 'paste' | 'selectAll';

/** Runs after the menu returns focus to the previously focused field. */
export function tmcmd_edit_runEditCommand(command: EditCommand) {
    setTimeout(() => document.execCommand(command), 0);
}
