import i18n from 'i18next';
import { showOpenDialog } from './01-show-open-dialog.tsx';

export async function askForFfPath(defaultPath?: string | undefined) {
    const { filePaths } = await showOpenDialog({
        properties: ['openDirectory'],
        ...(defaultPath != null && { defaultPath }),
        title: i18n.t('Select custom FFmpeg directory'),
    });
    return filePaths.length === 1 ? filePaths[0] : undefined;
}
