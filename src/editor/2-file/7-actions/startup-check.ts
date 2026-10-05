import i18n from 'i18next';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { handleError } from '@/editor/0-core/9-state/working.ts';
import { runFfmpegStartupCheck } from '@/editor/0-core/8-lib/ffmpeg/ffmpeg.ts';
import { mainApi } from '@/editor/0-core/8-lib/main-api.ts';
import { ffmpegInfoAtom } from '../9-state/a-file-atoms.ts';
import { dialog_SendReport_open } from '../0-ui/dlg-send-report.tsx';

// Port of upstream mifi.ts runStartupCheck

async function getFfmpegPath() {
    try {
        return (await mainApi.ffCheckExists()).ffmpegPath;
    } catch {
        return 'ffmpeg';
    }
}

export async function runStartupCheck({ customFfPath }: { customFfPath: string | undefined; }) {
    try {
        return await runFfmpegStartupCheck();
    } catch (err) {
        if (err instanceof Error) {
            if ('code' in err && err.code === 'ENOENT') {
                handleError({
                    title: i18n.t('Fatal: FFmpeg executable not found'),
                    err: [
                        i18n.t('Make sure that the FFmpeg executable exists:'),
                        '',
                        await getFfmpegPath(),
                        ...(customFfPath != null ? [
                            '',
                            i18n.t('You have configured a custom FFmpeg directory. You may change or reset it in Settings.'),
                        ] : []),
                    ].join('\n'),
                });
                return undefined;
            }

            if ('code' in err && typeof err.code === 'string' && ['EPERM', 'EACCES'].includes(err.code)) {
                handleError({
                    title: i18n.t('Fatal: FFmpeg not accessible'),
                    err: [
                        i18n.t('Error code: {{errorCode}}. This could mean that anti-virus or something else is blocking the execution of FFmpeg. Make sure the following file exists and is executable:', { errorCode: err.code }),
                        '',
                        await getFfmpegPath(),
                        '',
                        i18n.t('Read more: {{url}}', { url: 'https://github.com/mifi/lossless-cut/issues/1114' }),
                    ].join('\n'),
                });
                return undefined;
            }
        }

        dialog_SendReport_open({ message: i18n.t('FFmpeg is non-functional'), err });
        return undefined;
    }
}

let lastCustomFfPath: string | undefined | null = null;

/** Applies the custom FFmpeg path and re-runs the startup check when it changes */
export async function applyCustomFfPath(customFfPath: string | undefined) {
    if (lastCustomFfPath === customFfPath) return;
    lastCustomFfPath = customFfPath;
    try {
        await mainApi.ffSetCustomPath(customFfPath);
    } catch (err) {
        console.error('Failed to set custom FFmpeg path', err);
    }
    appStore.set(ffmpegInfoAtom, await runStartupCheck({ customFfPath }));
}
