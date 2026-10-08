import i18n from "i18next";
import { showDialog_Open } from "./01-show-open-dialog";
import { fs } from "../../../editor/0-core/8-lib/node-shims";

export async function askDialog_ForOutDir(defaultPath?: string | undefined) {
    const { filePaths } = await showDialog_Open({
        properties: ['openDirectory', 'createDirectory'],
        ...(defaultPath != null && { defaultPath }),
        title: i18n.t('Where do you want to save output files?'),
        message: i18n.t('Where do you want to save output files? Make sure there is enough free space in this folder'),
        buttonLabel: i18n.t('Select output folder'),
    });

    const [filePath] = filePaths;
    if (!filePath || filePaths.length !== 1) {
        return undefined;
    }

    // sanity check for directory. Don't trust showOpenDialog 100%, see https://github.com/mifi/lossless-cut/issues/2719
    if (!(await fs.lstat(filePath)).isDirectory()) {
        console.warn('Selected output path is not a directory', filePath);
        return undefined;
    }
    
    return filePath;
}
