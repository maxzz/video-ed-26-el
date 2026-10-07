import i18n from "i18next";
import { fireDialog } from "../7-0-dialogs/dialogs";

export async function askForImportChapters() {
    const { isConfirmed } = await fireDialog({
        icon: 'question',
        text: i18n.t('This file has embedded chapters. Do you want to import the chapters as cut-segments?'),
        showCancelButton: true,
        cancelButtonText: i18n.t('Ignore chapters'),
        confirmButtonText: i18n.t('Import chapters'),
    });
    return isConfirmed;
}
