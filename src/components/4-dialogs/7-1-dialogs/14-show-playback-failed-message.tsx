import i18n from "i18next";
import { show_ErrorToast } from "./00-app-dialogs";

export function showMessage_PlaybackFailed() {
    return show_ErrorToast(i18n.t('Unable to playback this file. Try to convert to supported format from the menu'));
}
