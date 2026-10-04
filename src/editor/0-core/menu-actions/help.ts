import { toggleKeyboardShortcuts as toggleKeyboardShortcutsImpl } from '@/editor/1-layout/9-state/panels-atoms.ts';
import { openSendReportDialogWithState } from '@/editor/2-file/7-actions/load-media.ts';

export function toggleKeyboardShortcuts() {
    toggleKeyboardShortcutsImpl();
}

export function openSendReportDialog() {
    openSendReportDialogWithState();
}
