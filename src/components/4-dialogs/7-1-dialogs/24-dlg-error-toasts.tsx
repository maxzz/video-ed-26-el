import i18n from "i18next";

import { fireDialog } from "../7-0-dialogs/dialogs";

export async function showDiskFull() {
    await fireDialog({ icon: 'error', text: i18n.t('The output location has no storage space remaining. Please free up some space and try again.') });
}

export async function showMuxNotSupported() {
    await fireDialog({ icon: 'error', text: i18n.t('At least one codec is not supported by the selected output file format. Try another output format or try to disable one or more tracks.') });
}

export async function showOutputNotWritable() {
    await fireDialog({ icon: 'error', text: i18n.t('You are not allowed to write the output file. This probably means that the file already exists with the wrong permissions, or you don\'t have write permissions to the output folder.') });
}

export async function showRefuseToOverwrite() {
    await fireDialog({ icon: 'warning', text: i18n.t('Output file already exists, refusing to overwrite. You can turn on overwriting in settings.') });
}
