import { type EditCommand } from "@/editor/0-core/8-lib/edit-command";
import { tmcmd_runEditCommand } from "@/editor/0-core/8-lib/edit-command";
import { tmcmd_extractAllStreams } from "@/editor/7-export/7-actions/export-actions";
import { tmcmd_redoSegments, tmcmd_undoSegments } from "@/editor/5-segments/9-state/a-segments-store";
import { tmcmd_showStreamsSelector } from "@/editor/6-streams/7-actions/streams-actions";

export function undo() {
    tmcmd_undoSegments();
}

export function redo() {
    tmcmd_redoSegments();
}

export function edit(command: EditCommand) {
    tmcmd_runEditCommand(command);
}

export function extractAllStreams() {
    return tmcmd_extractAllStreams();
}

export function showStreamsSelector() {
    tmcmd_showStreamsSelector();
}
