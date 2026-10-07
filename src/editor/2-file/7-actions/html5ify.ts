import i18n from "i18next";
import { type Html5ifyMode } from "@shared/types";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { customOutDirAtom, userSettings } from "@/editor/0-core/9-state/user-settings";
import { isWorking, setProgress, setWorking, withErrorHandling } from "@/editor/0-core/9-state/working";
import { DirectoryAccessDeclinedError } from "@/editor/0-core/8-lib/9-error-types";
import { toast } from "@/components/4-dialogs/7-0-dialogs/toast";
import { html5ify } from "@/editor/7-export/8-lib/ffmpeg-operations";
import { batchFilesAtom, filePathAtom, hasAudioAtom, hasVideoAtom, previewFilePathAtom, rememberConvertToSupportedFormatAtom, usingDummyVideoAtom } from "../9-state/a-file-atoms";
import { dialogAsync_askForHtml5ifySpeed } from "../0-ui/dlg-html5ify";
import { ensureWritableOutDir } from "./directory-access";

// Port of upstream useHtml5ify

async function html5ifyAndLoad(cod: string | undefined, fp: string, speed: Html5ifyMode, hv: boolean, ha: boolean) {
    try {
        setProgress(0);
        const path = await html5ify({ customOutDir: cod, filePath: fp, speed, hasAudio: ha, hasVideo: hv, onProgress: setProgress });
        if (!path) return;

        jotaiDefaultStore.set(previewFilePathAtom, path);
        jotaiDefaultStore.set(usingDummyVideoAtom, speed === 'fastest');
    } finally {
        setProgress(undefined);
    }
}

export async function userHtml5ifyCurrentFile({ ignoreRememberedValue }: { ignoreRememberedValue?: boolean; } = {}) {
    const filePath = jotaiDefaultStore.get(filePathAtom);
    if (!filePath) return;
    const hasAudio = jotaiDefaultStore.get(hasAudioAtom);
    const hasVideo = jotaiDefaultStore.get(hasVideoAtom);

    let selectedOption = jotaiDefaultStore.get(rememberConvertToSupportedFormatAtom);
    if (selectedOption == null || ignoreRememberedValue) {
        let allowedOptions: Html5ifyMode[] = [];
        if (hasAudio && hasVideo) allowedOptions = ['fastest', 'fast-audio-remux', 'fast-audio', 'fast', 'slow', 'slow-audio', 'slowest'];
        else if (hasAudio) allowedOptions = ['fast-audio-remux', 'slow-audio', 'slowest'];
        else if (hasVideo) allowedOptions = ['fastest', 'fast', 'slow', 'slowest'];
        if (allowedOptions.length === 0) return;

        const userResponse = await dialogAsync_askForHtml5ifySpeed({ allowedOptions, showRemember: true, initialOption: selectedOption });
        console.log('Choice', userResponse);
        if (userResponse == null) return;
        ({ selectedOption } = userResponse);

        jotaiDefaultStore.set(rememberConvertToSupportedFormatAtom, userResponse.rememberChoice ? selectedOption : undefined);
    }

    if (isWorking()) return;
    try {
        setWorking({ text: i18n.t('Converting to supported format') });
        await withErrorHandling(async () => {
            await html5ifyAndLoad(jotaiDefaultStore.get(customOutDirAtom), filePath, selectedOption, hasVideo, hasAudio);
        }, i18n.t('Failed to convert file. Try a different conversion'));
    } finally {
        setWorking(undefined);
    }
}

export async function convertFormatBatch() {
    const batchFiles = jotaiDefaultStore.get(batchFilesAtom);
    if (batchFiles.length === 0) return;

    const response = await dialogAsync_askForHtml5ifySpeed({ allowedOptions: ['fast-audio-remux', 'fast-audio', 'fast', 'slow', 'slow-audio', 'slowest'] });
    if (response == null) return;
    const { selectedOption: speed } = response;

    if (isWorking()) return;

    setWorking({ text: i18n.t('Batch converting to supported format') });
    setProgress(0);

    const filePaths = batchFiles.map((f) => f.path);
    const customOutDir = jotaiDefaultStore.get(customOutDirAtom);

    const failedFiles: string[] = [];
    let i = 0;
    const setTotalProgress = (fileProgress = 0) => setProgress((i + fileProgress) / filePaths.length);

    try {
        await withErrorHandling(async () => {
            for (const path of filePaths) {
                try {
                    const newCustomOutDir = await ensureWritableOutDir({ inputPath: path, outDir: customOutDir });
                    await html5ify({ customOutDir: newCustomOutDir, filePath: path, speed, hasAudio: true, hasVideo: true, onProgress: setTotalProgress });
                } catch (err2) {
                    if (err2 instanceof DirectoryAccessDeclinedError) return;

                    console.error('Failed to html5ify', path, err2);
                    failedFiles.push(path);
                }

                i += 1;
                setTotalProgress();
            }

            if (failedFiles.length > 0) toast.fire({ icon: 'warning', title: `${i18n.t('Failed to convert files:')} ${failedFiles.join(' ')}`, timer: 60_000 });
        }, i18n.t('Failed to batch convert to supported format'));
    } finally {
        setWorking(undefined);
        setProgress(undefined);
    }
}

export async function html5ifyAndLoadWithPreferences(cod: string | undefined, fp: string, speed: Html5ifyMode, hv: boolean, ha: boolean) {
    if (!userSettings.enableAutoHtml5ify) return;
    setWorking({ text: i18n.t('Converting to supported format') });
    await html5ifyAndLoad(cod, fp, jotaiDefaultStore.get(rememberConvertToSupportedFormatAtom) || speed, hv, ha);
}
