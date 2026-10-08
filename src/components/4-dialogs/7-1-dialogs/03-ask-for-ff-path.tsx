import i18n from "i18next";
import { showDialog_Open } from "./01-show-open-dialog";

export async function askDialog_ForFfPath(defaultPath?: string | undefined) {
    const { filePaths } = await showDialog_Open({
        properties: ['openDirectory'],
        ...(defaultPath != null && { defaultPath }),
        title: i18n.t('Select custom FFmpeg directory'),
    });
    return filePaths.length === 1 ? filePaths[0] : undefined;
}
