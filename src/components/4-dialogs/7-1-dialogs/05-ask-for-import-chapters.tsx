import i18n from "i18next";
import { fire_Dialog } from "../7-0-dialogs/1-dialogs";

export async function askDialog_ForImportChapters() {
    const { isConfirmed } = await fire_Dialog({
        icon: 'question',
        text: i18n.t('This file has embedded chapters. Do you want to import the chapters as cut-segments?'),
        showCancelButton: true,
        cancelButtonText: i18n.t('Ignore chapters'),
        confirmButtonText: i18n.t('Import chapters'),
    });
    return isConfirmed;
}
