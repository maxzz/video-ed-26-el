import i18n from 'i18next';
import invariant from 'tiny-invariant';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { customOutDirAtom, userSettings } from '@/editor/0-core/9-state/user-settings.ts';
import { formatTimecode, parseTimecode, promptTimecode, timecodePlaceholderAtom } from '@/editor/0-core/9-state/timecode.ts';
import { isWorking, setWorking } from '@/editor/0-core/9-state/working.ts';
import { showPlaybackFailedMessage, toastError } from '@/editor/0-core/8-lib/app-dialogs.tsx';
import { UserFacingError } from '@/editor/0-core/8-lib/errors.ts';
import { toast } from '@/editor/0-core/8-lib/toast.tsx';
import { mediaSourceQualities } from '@/editor/0-core/8-lib/util.ts';
import { fullscreenAtom } from '@/components/2-main/0-all/a-panels-atoms.ts';
import { fileDurationAtom, filePathAtom, hasAudioAtom, hasVideoAtom, usingPreviewFileAtom } from '@/editor/2-file/9-state/file-atoms.ts';
import { html5ifyAndLoadWithPreferences } from '@/editor/2-file/7-actions/html5ify.ts';
import { isFileDurationValid, showNotNativelySupportedMessage } from '@/editor/2-file/7-actions/load-media.ts';
import { maybeCreateFullLengthSegment } from '@/editor/5-segments/7-actions/segment-actions.ts';
import { isDurationValid } from '@/editor/5-segments/8-lib/segments.ts';
import { commandedTimeAtom, mediaSourceQualityAtom, videoContainerElementAtom, videoElementAtom } from '../9-state/player-atoms.ts';
import { seekAbs, seekRel } from './player-actions.ts';

/** Some files report duration infinity first, then proper duration later. Sometimes after seeking to end of file, duration might change */
export function onDurationChange(durationNew: number) {
    console.log('onDurationChange', durationNew);
    if (isDurationValid(durationNew)) {
        appStore.set(fileDurationAtom, durationNew);
        maybeCreateFullLengthSegment(durationNew);
    }
}

const PIPELINE_ERROR_READ = 2; // e.g. file has been moved after opening https://github.com/mifi/lossless-cut/issues/2423
const PIPELINE_ERROR_DECODE = 3; // This usually happens when the user presses play or seeks, but the video is not actually playable. To reproduce: "RX100VII PCM audio timecode.MP4" or see https://github.com/mifi/lossless-cut/issues/804
const MEDIA_ERR_SRC_NOT_SUPPORTED = 4; // Test: issue-668-3.20.1.m2ts - NOTE: DEMUXER_ERROR_COULD_NOT_OPEN and DEMUXER_ERROR_NO_SUPPORTED_STREAMS is also 4

export async function onVideoError() {
    const error = appStore.get(videoElementAtom)?.error;
    if (!error) return;

    console.error('onVideoError', error.message, error.code);

    try {
        const filePath = appStore.get(filePathAtom);
        const isCouldNotParse = error.code === MEDIA_ERR_SRC_NOT_SUPPORTED && error.message?.startsWith('DEMUXER_ERROR_COULD_NOT_PARSE');
        if (
            // MEDIA_ERR_SRC_NOT_SUPPORTED generally means we need to convert to supported format,
            // _however_ this error can also happen half way into playback if the file has some corruption
            // but in that case we also get: "DEMUXER_ERROR_COULD_NOT_PARSE: FFmpegDemuxer: PTS is not defined 4"
            // and we don't want to auto convert in that case:
            ((error.code === MEDIA_ERR_SRC_NOT_SUPPORTED && !isCouldNotParse) || error.code === PIPELINE_ERROR_DECODE)
            && !appStore.get(usingPreviewFileAtom) // if we are already using preview file, we shouldn't try to do it again
            && filePath
        ) {
            if (isWorking()) return;
            try {
                setWorking({ text: i18n.t('Converting to supported format') });

                console.log('Trying to convert to supported format');

                // A valid duration is needed to create a html5ified dummy (`fastest`).
                if (!isFileDurationValid()) {
                    throw new UserFacingError(i18n.t('Invalid duration'));
                }

                const hasVideo = appStore.get(hasVideoAtom);
                const hasAudio = appStore.get(hasAudioAtom);
                if (hasVideo || hasAudio) {
                    await html5ifyAndLoadWithPreferences(appStore.get(customOutDirAtom), filePath, 'fastest', hasVideo, hasAudio);
                    showNotNativelySupportedMessage();
                }
            } catch (err) {
                if (err instanceof UserFacingError) throw err;
                console.error(err);
                showPlaybackFailedMessage();
            } finally {
                setWorking(undefined);
            }
        } else if (error.code === PIPELINE_ERROR_READ) { // file is not readable or was removed
            toast.fire({ icon: 'error', timer: 10000, text: i18n.t('Failed to read file. Perhaps it has been moved?') });
        }
    } catch (err) {
        toastError(err);
    }
}

export async function goToTimecode() {
    if (!appStore.get(filePathAtom)) return;
    const timecode = await promptTimecode({
        initialValue: formatTimecode({ seconds: appStore.get(commandedTimeAtom) }),
        title: i18n.t('Seek to timecode'),
        description: i18n.t('Use + and - for relative seek'),
        allowRelative: true,
        inputPlaceholder: appStore.get(timecodePlaceholderAtom),
    });

    if (timecode === undefined) return;

    if (timecode.relDirection != null) seekRel(timecode.duration * timecode.relDirection);
    else seekAbs(timecode.duration);
}

export function goToTimecodeDirect({ time: timeStr }: { time: string; }) {
    if (!appStore.get(filePathAtom)) return;
    invariant(timeStr != null);
    const timecode = parseTimecode(timeStr);
    invariant(timecode != null);
    seekAbs(timecode);
}

export async function toggleFullscreenVideo() {
    if (!document.fullscreenEnabled) {
        console.warn('Fullscreen not allowed');
        return;
    }
    try {
        if (appStore.get(videoElementAtom) == null) {
            console.warn('No video tag to full screen');
            return;
        }
        const container = appStore.get(videoContainerElementAtom);
        invariant(container != null);
        if (document.fullscreenElement) await document.exitFullscreen();
        else await container.requestFullscreen({ navigationUI: 'hide' });
    } catch (err) {
        console.error('Failed to toggle fullscreen', err);
    }
}

document.addEventListener('fullscreenchange', () => appStore.set(fullscreenAtom, document.fullscreenElement != null));

export function setPlaybackVolume(volume: number) {
    userSettings.playbackVolume = Math.min(1, Math.max(0, volume));
}

export const increaseVolume = () => setPlaybackVolume(userSettings.playbackVolume + 0.07);
export const decreaseVolume = () => setPlaybackVolume(userSettings.playbackVolume - 0.07);

export function incrementMediaSourceQuality() {
    appStore.set(mediaSourceQualityAtom, (v) => (v + 1) % mediaSourceQualities.length);
}
