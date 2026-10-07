import i18n from "i18next";
import { type OpenDialogOptions } from "@shared/ipc-contract";
import { isWindows, mainApi } from "../../../editor/0-core/7-actions/0-main-api";

// https://github.com/mifi/lossless-cut/issues/1495
export async function showOpenDialog({ filters = isWindows ? [{ name: i18n.t('All Files'), extensions: ['*'] }] : undefined, title, ...props }: OpenDialogOptions & { title: string; }) {
    return mainApi.showOpenDialog({ ...props, title, ...(filters != null ? { filters } : {}) });
}
