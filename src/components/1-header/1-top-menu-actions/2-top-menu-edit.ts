import { type EditCommand } from "@/editor/0-core/8-lib/edit-command";
import { tmcmd_edit_runEditCommand } from "@/editor/0-core/8-lib/edit-command";
import { tmcmd_edit_extractAllStreams } from "@/editor/7-export/7-actions/export-actions";
import { tmcmd_edit_redoSegments, tmcmd_edit_undoSegments } from "@/editor/5-segments/9-state/a-segments-store";
import { tmcmd_edit_showStreamsSelector } from "@/editor/6-streams/7-actions/streams-actions";

export function undo() {
    tmcmd_edit_undoSegments();
}

export function redo() {
    tmcmd_edit_redoSegments();
}

export function edit(command: EditCommand) {
    tmcmd_edit_runEditCommand(command);
}

export function extractAllStreams() {
    return tmcmd_edit_extractAllStreams();
}

export function showStreamsSelector() {
    tmcmd_edit_showStreamsSelector();
}
