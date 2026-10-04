import { observe } from 'jotai-effect';
import debounce from 'lodash/debounce';
import type { AudioStreamInfo, FfmpegHwAccel } from '@shared/types';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { getAppInfo, mainApi } from '@/editor/0-core/8-lib/main-api.ts';
import { getFrameDuration } from '@/editor/0-core/8-lib/util.ts';
import { filePathAtom } from '@/editor/2-file/9-state/file-atoms.ts';
import {
    activeAudioStreamsAtom, activeVideoStreamAtom, compatCanvasElementAtom, compatLoadingAtom, compatPlayerEnabledAtom, compatShowCanvasAtom,
    compatVideoElementAtom, effectiveRotationAtom, ffmpegHwaccelAtom, hideCompatPlayerAtom, mediaSourceQualityAtom, videoElementAtom,
} from '../9-state/player-atoms.ts';

// Port of upstream MediaSourcePlayer.startPlayback. Main streams fragmented mp4 from ffmpeg over the media-compat:// protocol,
// we fetch() it and feed the chunks into a MediaSource of a "slave" <video> that is kept in sync with the master <video>.

const isDev = () => {
    try {
        return getAppInfo().isDev;
    } catch {
        return false;
    }
};

async function startPlayback({ path, slaveVideo, masterVideo, videoStreamIndex, audioStreams, seekTo, signal, size, fps, rotate, onCanPlay, onResetNeeded, onWaiting, ffmpegHwaccel }: {
    path: string;
    slaveVideo: HTMLVideoElement;
    masterVideo: HTMLVideoElement;
    videoStreamIndex?: number | undefined;
    audioStreams: AudioStreamInfo[];
    seekTo: number;
    signal: AbortSignal;
    size?: number | undefined;
    fps?: number | undefined;
    rotate: number | undefined;
    onCanPlay: () => void;
    onResetNeeded: () => void;
    onWaiting: () => void;
    ffmpegHwaccel: FfmpegHwAccel;
}) {
    let canPlay = false;
    let bufferEndTime: number | undefined;
    let bufferStartTime = seekTo;
    let interval: ReturnType<typeof setInterval> | undefined;
    let interval2: ReturnType<typeof setInterval> | undefined;
    let objectUrl: string | undefined;
    let processChunkTimeout: ReturnType<typeof setTimeout> | undefined;
    let compatUrl: string | undefined;

    signal.addEventListener('abort', () => {
        console.log('Cleanup');
        slaveVideo.pause();
        if (interval != null) clearInterval(interval);
        if (interval2 != null) clearInterval(interval2);
        if (processChunkTimeout != null) clearTimeout(processChunkTimeout);
        if (compatUrl != null) mainApi.ffAbortCompatStream(compatUrl).catch((err: unknown) => console.error(err));
        if (objectUrl != null) URL.revokeObjectURL(objectUrl);
        slaveVideo.removeAttribute('src');
    });

    // See chrome://media-internals

    let streamTimestamp: number | undefined;
    let lastRemoveTimestamp = seekTo;

    const setPlaybackRate = (r: number) => {
        const maxAllowedPlaybackRate = 16; // or else we get an error in Chromium
        const newAdjustedRate = Math.min(maxAllowedPlaybackRate, r * masterVideo.playbackRate);
        if (slaveVideo.playbackRate === newAdjustedRate) return false;
        slaveVideo.playbackRate = newAdjustedRate;
        return true;
    };

    // set it a bit faster, so that we don't easily fall behind (better too fast than too slow)
    const setStandardPlaybackRate = () => setPlaybackRate(1.05);

    setStandardPlaybackRate();

    const codecs: string[] = [];
    if (videoStreamIndex != null) codecs.push('avc1.42C01F');
    if (audioStreams.length > 0) codecs.push('mp4a.40.2');
    const mimeCodec = `video/mp4; codecs="${codecs.join(', ')}"`;

    if (!MediaSource.isTypeSupported(mimeCodec)) {
        throw new Error(`Unsupported MIME type or codec: ${mimeCodec}`);
    }

    compatUrl = await mainApi.ffCreateCompatStream({ path, videoStreamIndex, audioStreams, seekTo, size, fps, rotate, ffmpegHwaccel });
    if (signal.aborted) {
        mainApi.ffAbortCompatStream(compatUrl).catch((err: unknown) => console.error(err));
        return;
    }

    console.log('Waiting for media source process to emit first data...');
    const response = await fetch(compatUrl, { signal });
    if (!response.ok || response.body == null) throw new Error(`Media source stream failed: ${response.status}`);
    const reader = response.body.getReader();
    signal.addEventListener('abort', () => { reader.cancel().catch(() => undefined); });

    const readChunk = async () => {
        const { done, value } = await reader.read();
        return done ? undefined : value;
    };

    let pendingChunk = await readChunk();
    if (pendingChunk == null) {
        if (signal.aborted) return;
        throw new Error('Media source process did not initialize');
    }
    console.log('Media source process emitted first data');

    const mediaSource = new MediaSource();

    objectUrl = URL.createObjectURL(mediaSource);
    slaveVideo.src = objectUrl;

    await new Promise((resolve) => mediaSource.addEventListener('sourceopen', resolve, { once: true }));

    const sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
    sourceBuffer.timestampOffset = seekTo - getFrameDuration(fps); // subtract 1 frame in order to attempt to avoid this issue: https://github.com/mifi/lossless-cut/issues/2591#issuecomment-3478018458

    signal.addEventListener('abort', () => {
        try {
            sourceBuffer.abort();
        } catch {
            // already detached
        }
    });

    const getBufferEndTime = () => {
        if (mediaSource.readyState !== 'open') {
            console.log('mediaSource.readyState was not open, but:', mediaSource.readyState);
            // else we will get: Uncaught DOMException: Failed to execute 'end' on 'TimeRanges': The index provided (0) is greater than or equal to the maximum bound (0).
            return undefined;
        }
        if (sourceBuffer.buffered.length === 0) return undefined;
        return sourceBuffer.buffered.end(0);
    };

    let firstChunkReceived = false;

    const processChunk = async () => {
        try {
            const chunk = pendingChunk ?? await readChunk();
            pendingChunk = undefined;
            if (chunk == null) {
                console.log('End of stream');
                return;
            }

            if (signal.aborted) return;

            if (!firstChunkReceived) {
                firstChunkReceived = true;
                console.log('First chunk received');
            }

            sourceBuffer.appendBuffer(chunk as BufferSource);
        } catch (err) {
            if (signal.aborted) return;
            console.error('processChunk failed', err);
            processChunkTimeout = setTimeout(processChunk, 1000);
        }
    };

    sourceBuffer.addEventListener('error', (err) => console.error('sourceBuffer error, check DevTools ▶ More Tools ▶ Media', err));

    const handleCanPlay = () => {
        console.log('canplay');
        canPlay = true;
        onCanPlay();
    };
    const handleWaiting = () => {
        if (slaveVideo.paused || slaveVideo.ended) return; // we don't care if paused
        console.log('waiting');
        onWaiting();
    };
    slaveVideo.addEventListener('canplay', handleCanPlay);
    slaveVideo.addEventListener('waiting', handleWaiting);

    signal.addEventListener('abort', () => {
        slaveVideo.removeEventListener('canplay', handleCanPlay);
        slaveVideo.removeEventListener('waiting', handleWaiting);
    });

    sourceBuffer.addEventListener('updateend', ({ timeStamp }) => {
        if (signal.aborted) return;

        streamTimestamp = timeStamp; // apparently this timestamp cannot be trusted much

        const bufferThrottleSec = isDev() ? 5 : 10; // how many seconds ahead of playback we want to buffer
        const bufferMaxSec = bufferThrottleSec + (isDev() ? 5 : 60); // how many seconds we want to buffer in total (ahead of playback and behind)

        bufferEndTime = getBufferEndTime();

        if (bufferEndTime != null) {
            const bufferedDuration = bufferEndTime - lastRemoveTimestamp;

            if (bufferedDuration > bufferMaxSec && !sourceBuffer.updating) {
                try {
                    lastRemoveTimestamp = bufferEndTime;
                    const removeTo = bufferEndTime - bufferMaxSec;
                    bufferStartTime = removeTo;
                    console.log('sourceBuffer remove', 0, removeTo);
                    sourceBuffer.remove(0, removeTo); // updateend will be emitted again when this is done
                    return;
                } catch (err) {
                    console.error('sourceBuffer remove failed', err);
                }
            }

            const bufferAheadSec = bufferEndTime - masterVideo.currentTime;
            if (bufferAheadSec > bufferThrottleSec) {
                console.debug(`buffer ahead by ${bufferAheadSec}, throttling stream read`);
                processChunkTimeout = setTimeout(processChunk, 1000);
                return;
            }
        }

        // make sure we always process the next chunk
        processChunk();
    });

    interval = setInterval(() => {
        if (!canPlay) return;

        if (mediaSource.readyState !== 'open') {
            console.warn('mediaSource.readyState was not open, but:', mediaSource.readyState);
            return;
        }

        if (isDev()) console.log(`bufferStartTime: ${bufferStartTime}, bufferEndTime: ${bufferEndTime}, master time: ${masterVideo.currentTime}, slave time: ${slaveVideo.currentTime} (diff: ${masterVideo.currentTime - slaveVideo.currentTime}), streamTimestamp: ${streamTimestamp}`);

        if (sourceBuffer.buffered.length !== 1) {
            // not sure why this would happen or how to handle this
            console.warn('sourceBuffer.buffered.length was', sourceBuffer.buffered.length);
        }
    }, 1000);

    // Synchronize state between the two video elements
    interval2 = setInterval(async () => {
        try {
            const maxSecAfterBufferToWaitFor = 5;
            if (masterVideo.currentTime < bufferStartTime || (bufferEndTime != null && masterVideo.currentTime - bufferEndTime > maxSecAfterBufferToWaitFor)) {
                console.log('Seeked before/after buffered range, resetting playback');
                onResetNeeded();
                return;
            }

            if (masterVideo.paused || masterVideo.ended) {
                const resolution = 1000;
                if (Math.round(slaveVideo.currentTime * resolution) !== Math.round(masterVideo.currentTime * resolution)) {
                    slaveVideo.currentTime = masterVideo.currentTime;
                }
            } else { // playing
                // make sure the playback keeps up while playing
                // or when seeking while playing
                // https://stackoverflow.com/questions/23301496/how-to-keep-a-live-mediasource-video-stream-in-sync
                const playbackDiff = masterVideo.currentTime - slaveVideo.currentTime;
                if (Math.abs(playbackDiff) > 1) {
                    console.log(`Playback ${playbackDiff > 0 ? 'behind' : 'ahead'} master player time by ${playbackDiff}s, jumping to desired time`);
                    slaveVideo.currentTime = masterVideo.currentTime;
                    setStandardPlaybackRate();
                } else if (playbackDiff > 0.3) {
                    if (setPlaybackRate(1.5)) {
                        console.warn(`Playback behind by ${playbackDiff}s, speeding up playback`);
                    }
                } else {
                    setStandardPlaybackRate();
                }
            }

            if (slaveVideo.volume !== masterVideo.volume) {
                slaveVideo.volume = masterVideo.volume;
            }

            const masterStopped = masterVideo.paused || masterVideo.ended;
            const slaveStopped = slaveVideo.paused || slaveVideo.ended;

            if (slaveStopped && !masterStopped) {
                await slaveVideo.play();
            } else if (!slaveStopped && masterStopped) {
                slaveVideo.pause();
            }
        } catch (err) {
            console.error('play/pause failed', err);
        }
    }, 30);

    // OK, everything initialized and ready to stream!
    processChunk();
}

// (Re)start the compat stream whenever its inputs change
observe((get) => {
    const enabled = get(compatPlayerEnabledAtom);
    const filePath = get(filePathAtom);
    const slaveVideo = get(compatVideoElementAtom);
    const canvas = get(compatCanvasElementAtom);
    const masterVideo = get(videoElementAtom);
    if (!enabled || filePath == null || slaveVideo == null || canvas == null || masterVideo == null) return undefined;

    const videoStream = get(activeVideoStreamAtom);
    const audioStreams = get(activeAudioStreamsAtom).map(({ index, channels, channel_layout: channelLayout }) => ({ index, channels, channelLayout }));
    const mediaSourceQuality = get(mediaSourceQualityAtom);
    const rotate = get(effectiveRotationAtom);
    const ffmpegHwaccel = get(ffmpegHwaccelAtom);

    let abortController = new AbortController();

    const start = async () => {
        abortController = new AbortController();

        canvas.width = slaveVideo.videoWidth;
        canvas.height = slaveVideo.videoHeight;
        canvas.getContext('2d')?.drawImage(slaveVideo, 0, 0, canvas.width, canvas.height);
        appStore.set(compatShowCanvasAtom, true);
        appStore.set(compatLoadingAtom, true);

        const seekTo = masterVideo.currentTime;

        try {
            let size: number | undefined;
            if (videoStream != null) {
                if (mediaSourceQuality === 0) size = 800;
                else if (mediaSourceQuality === 1) size = 420;
            }

            let fps: number | undefined;
            if (mediaSourceQuality === 0) fps = 30;
            else if (mediaSourceQuality === 1) fps = 15;

            await startPlayback({
                signal: abortController.signal,
                path: filePath,
                slaveVideo,
                masterVideo,
                videoStreamIndex: videoStream?.index,
                audioStreams,
                seekTo,
                size,
                fps,
                rotate,
                onCanPlay: () => {
                    appStore.set(compatLoadingAtom, false);
                    appStore.set(compatShowCanvasAtom, false);
                },
                onResetNeeded: () => {
                    abortController.abort();
                    startDebounced();
                },
                onWaiting: () => {
                    appStore.set(compatLoadingAtom, true);
                },
                ffmpegHwaccel,
            });
        } catch (err) {
            if (abortController.signal.aborted) return;
            console.error('Preview failed', err);
        }
    };

    const startDebounced = debounce(start, 500, { leading: true, trailing: true });
    startDebounced();

    return () => {
        startDebounced.cancel();
        abortController.abort();
    };
}, appStore);

// Reset the user preference when we go from not having compat player to having it
observe((get) => {
    if (get(compatPlayerEnabledAtom)) appStore.set(hideCompatPlayerAtom, false);
}, appStore);
