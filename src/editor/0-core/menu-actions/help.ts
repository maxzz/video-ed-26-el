import { toggleKeyboardShortcuts as toggleKeyboardShortcutsImpl } from '@/components/2-main/0-all/a-panels-atoms';
import { openSendReportDialogWithState } from '@/editor/2-file/7-actions/load-media.ts';

export function toggleKeyboardShortcuts() {
    toggleKeyboardShortcutsImpl();
}

export function openSendReportDialog() {
    openSendReportDialogWithState();
}
