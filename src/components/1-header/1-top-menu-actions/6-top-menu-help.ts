import { tmcmd_toggleKeyboardShortcuts } from "@/components/2-main/0-all/a-panels-atoms";
import { tmcmd_openSendReportDialogWithState } from "@/editor/2-file/7-actions/load-media";

export function toggleKeyboardShortcuts() {
    tmcmd_toggleKeyboardShortcuts();
}

export function openSendReportDialog() {
    tmcmd_openSendReportDialogWithState();
}
