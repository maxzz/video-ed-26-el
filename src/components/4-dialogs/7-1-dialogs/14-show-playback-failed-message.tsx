import i18n from "i18next";
import { errorToast } from "./00-app-dialogs";

export const showPlaybackFailedMessage = () => errorToast(i18n.t('Unable to playback this file. Try to convert to supported format from the menu'));
