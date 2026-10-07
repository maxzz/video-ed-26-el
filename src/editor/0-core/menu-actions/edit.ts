import { type EditCommand } from "@/editor/0-core/8-lib/edit-command";
import { runEditCommand } from "@/editor/0-core/8-lib/edit-command";
import { extractAllStreams as extractAllStreamsImpl } from "@/editor/7-export/7-actions/export-actions";
import { redoSegments, undoSegments } from "@/editor/5-segments/9-state/a-segments-store";
import { showStreamsSelector as showStreamsSelectorImpl } from "@/editor/6-streams/7-actions/streams-actions";

export function undo() {
    undoSegments();
}

export function redo() {
    redoSegments();
}

export function edit(command: EditCommand) {
    runEditCommand(command);
}

export function extractAllStreams() {
    return extractAllStreamsImpl();
}

export function showStreamsSelector() {
    showStreamsSelectorImpl();
}
