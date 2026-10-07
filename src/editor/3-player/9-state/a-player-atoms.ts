import { atom } from "jotai";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";

import { type FFprobeStream } from "@shared/ffprobe";
import { type ChromiumHTMLVideoElement, type PlaybackMode } from "@/editor/0-core/8-lib/9-types-core";
import { audioStreamsAtom, isRotationSetAtom, mainAudioStreamAtom, mainVideoStreamAtom, rotationAtom, subtitleStreamsAtom, usingDummyVideoAtom, videoStreamsAtom } from "@/editor/2-file/9-state/a-file-atoms";
import { canHtml5PlayerPlayStreams } from "@/editor/0-core/8-lib/ffmpeg/streams";
import { userSettingsAtom } from "@/editor/0-core/9-state/user-settings";
import { onFileReset } from "@/editor/0-core/7-actions/2-lifecycle";

/** Set by the <video> ref callback */
export const videoElementAtom = atom<ChromiumHTMLVideoElement | null>(null);
export const videoContainerElementAtom = atom<HTMLDivElement | null>(null);

/** The time the user seeked to */
export const commandedTimeAtom = atom(0);
/** The time reported by the player while playing. High frequency: read only in small leaf components */
export const playerTimeAtom = atom<number | undefined>(undefined);
export const playingAtom = atom(false);
export const playbackRateAtom = atom(1);
export const outputPlaybackRateAtom = atom(1);
export const playbackModeAtom = atom<PlaybackMode | undefined>(undefined);

/** Relevant time is the player's playback position if we're currently playing - if not, it's the user's commanded time */
export const relevantTimeAtom = atom((get) => (get(playingAtom) ? get(playerTimeAtom) : get(commandedTimeAtom)) || 0);

// Playback streams

export const activeVideoStreamIndexAtom = atom<number | undefined>(undefined);
export const activeAudioStreamIndexesAtom = atom<Set<number>>(new Set<number>());
export const activeSubtitleStreamIndexAtom = atom<number | undefined>(undefined);
export const subtitlesByStreamIdAtom = atom<Record<number, { url: string; lang?: string | undefined; }>>({});
export const hideCompatPlayerAtom = atom(false);
export const mediaSourceQualityAtom = atom(0);

// Compat (MSE) player. Elements are set by ref callbacks of <MediaSourcePlayer>

export const compatVideoElementAtom = atom<HTMLVideoElement | null>(null);
export const compatCanvasElementAtom = atom<HTMLCanvasElement | null>(null);
export const compatLoadingAtom = atom(true);
export const compatShowCanvasAtom = atom(false);

/** "No file loaded" drop zone highlight */
export const draggingOverDropZoneAtom = atom(false);

export const playbackVolumeAtom = atom((get) => get(userSettingsAtom).playbackVolume);
export const ffmpegHwaccelAtom = atom((get) => get(userSettingsAtom).ffmpegHwaccel);

export const activeSubtitleAtom = atom(
    (get) => {
        const index = get(activeSubtitleStreamIndexAtom);
        return index != null ? get(subtitlesByStreamIdAtom)[index] : undefined;
    }
);

export const activeVideoStreamAtom = atom(
    (get) => {
        const index = get(activeVideoStreamIndexAtom);
        return (index != null ? get(videoStreamsAtom).find((stream) => stream.index === index) : undefined) ?? get(mainVideoStreamAtom);
    }
);

export const activeAudioStreamsAtom = atom(
    (get) => {
        const indexes = get(activeAudioStreamIndexesAtom);
        let ret: FFprobeStream[] = [];
        if (indexes.size > 0) {
            ret = get(audioStreamsAtom).filter((stream) => indexes.has(stream.index));
        }
        const main = get(mainAudioStreamAtom);
        if (ret.length === 0 && main != null) {
            ret = [main];
        }
        return ret;
    }
);

export const effectiveRotationAtom = atom(
    (get) => {
        if (get(isRotationSetAtom)) {
            return get(rotationAtom);
        }
        const rotate = get(activeVideoStreamAtom)?.tags?.rotate;
        return rotate ? parseInt(rotate, 10) : undefined;
    }
);

export const compatPlayerRequiredAtom = atom(
    (get) => {
        const video = get(videoElementAtom);
        const activeVideoStreamIndex = get(activeVideoStreamIndexAtom);
        const activeAudioStreamIndexes = get(activeAudioStreamIndexesAtom);
        return (
            // if user selected an explicit video or audio stream, and the html5 player does not have any track index corresponding to the selected stream index
            (
                (activeVideoStreamIndex != null || activeAudioStreamIndexes.size === 1)
                && video != null
                && !canHtml5PlayerPlayStreams(video, activeVideoStreamIndex, [...activeAudioStreamIndexes][0])
            )
            // or if selected multiple audio streams (html5 video element doesn't support that)
            || activeAudioStreamIndexes.size > 1
        );
    }
);

export const compatPlayerWantedAtom = atom(
    (get) => (get(isRotationSetAtom) && !get(hideCompatPlayerAtom)) || get(usingDummyVideoAtom)
);

export const shouldShowPlaybackStreamSelectorAtom = atom(
    (get) => get(videoStreamsAtom).length > 0 || get(audioStreamsAtom).length > 0 || (get(subtitleStreamsAtom).length > 0 && !get(compatPlayerEnabledAtom))
);

export const compatPlayerEnabledAtom = atom(
    (get) => (
        (get(compatPlayerRequiredAtom) || get(compatPlayerWantedAtom))
        && (get(activeVideoStreamAtom) != null || get(activeAudioStreamsAtom).length > 0)
    )
);

onFileReset(
    () => {
        jotaiDefaultStore.set(commandedTimeAtom, 0);
        const video = jotaiDefaultStore.get(videoElementAtom);
        if (video) {
            video.currentTime = 0;
        }
        jotaiDefaultStore.set(playbackRateAtom, 1);
        jotaiDefaultStore.set(playingAtom, false);
        jotaiDefaultStore.set(playbackModeAtom, undefined);
        jotaiDefaultStore.set(subtitlesByStreamIdAtom, {});
        jotaiDefaultStore.set(activeAudioStreamIndexesAtom, new Set<number>());
        jotaiDefaultStore.set(activeVideoStreamIndexAtom, undefined);
        jotaiDefaultStore.set(activeSubtitleStreamIndexAtom, undefined);
        jotaiDefaultStore.set(hideCompatPlayerAtom, false);
        jotaiDefaultStore.set(outputPlaybackRateAtom, 1);
    }
);
