import i18n from 'i18next';
import invariant from 'tiny-invariant';
import { setCustomOutDir } from '@/editor/0-core/9-state/user-settings.ts';
import { askForOutDir } from '@/components/4-dialogs/7-1-dialogs/02-ask-for-out-dir.tsx';
import { showOpenDialog } from '@/components/4-dialogs/7-1-dialogs/01-show-open-dialog.tsx';
import { errorToast } from '@/components/4-dialogs/7-1-dialogs/00-app-dialogs';
import { DirectoryAccessDeclinedError } from '@/editor/0-core/8-lib/9-error-types';
import { mainApi } from '@/editor/0-core/7-actions/0-main-api';
import { fs } from '@/editor/0-core/8-lib/node-shims.ts';
import { checkDirWriteAccess, getFileDir, getOutDir } from '@/editor/0-core/8-lib/util.ts';

// Port of upstream useDirectoryAccess.
// The MacOS App Store sandbox only allows access to user selected paths. We are never a MAS build,
// so the "ask for a directory until the user grants access" loops collapse to a single check.
const masMode = false;

export async function askForInputDir(defaultPath?: string | undefined) {
    const { filePaths } = await showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        ...(defaultPath != null && { defaultPath }),
        title: i18n.t('Please confirm folder'),
        message: i18n.t('Press confirm to grant LosslessCut access to write the project file (due to App Sandbox restrictions).'),
        buttonLabel: i18n.t('Confirm'),
    });
    return filePaths.length === 1 ? filePaths[0] : undefined;
}

/** Called if we need to read/write to the source file's directory (probably to read/write the project file) */
export async function ensureAccessToSourceDir(inputPath: string) {
    const inputFileDir = getFileDir(inputPath);
    invariant(inputFileDir != null);

    for (;;) {
        if (await checkDirWriteAccess(inputFileDir)) break;

        if (!masMode) {
            errorToast(i18n.t('You have no write access to the directory of this file'));
            throw new DirectoryAccessDeclinedError();
        }

        const userSelectedDir = await askForInputDir(inputFileDir);
        if (userSelectedDir == null) throw new DirectoryAccessDeclinedError();
    }
}

/** Returns the (possibly changed) custom output dir. Throws DirectoryAccessDeclinedError if we cannot write */
export async function ensureWritableOutDir({ inputPath, outDir }: { inputPath?: string | undefined; outDir: string | undefined; }) {
    let newCustomOutDir = outDir;

    if (newCustomOutDir) {
        // Reset if working directory doesn't exist anymore
        const customOutDirExists = (await mainApi.pathExists(newCustomOutDir)) && (await fs.lstat(newCustomOutDir)).isDirectory();
        if (!customOutDirExists) {
            setCustomOutDir(undefined);
            newCustomOutDir = undefined;
        }
    }

    // if we don't (no longer) have a working dir, and not an main file path, then there's nothing we can do, just return the dir
    if (!newCustomOutDir && !inputPath) return newCustomOutDir;

    const effectiveOutDirPath = getOutDir(newCustomOutDir, inputPath);
    const hasDirWriteAccess = effectiveOutDirPath != null && await checkDirWriteAccess(effectiveOutDirPath);
    if (!hasDirWriteAccess) {
        if (masMode) {
            const newOutDir = await askForOutDir(effectiveOutDirPath);
            if (!newOutDir) throw new DirectoryAccessDeclinedError();
            setCustomOutDir(newOutDir);
            newCustomOutDir = newOutDir;
        } else {
            errorToast(i18n.t('You have no write access to the directory of this file, please select a custom working dir'));
            setCustomOutDir(undefined);
            throw new DirectoryAccessDeclinedError();
        }
    }

    return newCustomOutDir;
}

export type EnsureWritableOutDir = typeof ensureWritableOutDir;
