import i18n from 'i18next';
import { observe } from 'jotai-effect';
import sortBy from 'lodash/sortBy.js';
import invariant from 'tiny-invariant';
import type { WaveformSlice } from '@/editor/0-core/8-lib/types.ts';
import { appStore } from '@/components/4-dialogs/7-0-dialogs/store.ts';
import { isWorking, setWorking } from '@/editor/0-core/9-state/working.ts';
import { onFileReset } from '@/editor/0-core/7-actions/lifecycle.ts';
import { ffmpegExtractWindow } from '@/editor/0-core/8-lib/constants.ts';
import { renderWaveformPng, safeCreateBlob } from '@/editor/0-core/8-lib/ffmpeg/ffmpeg.ts';
import { fileDurationAtom, filePathAtom } from '@/editor/2-file/9-state/a-file-atoms.ts';
import { relevantTimeAtom } from '@/editor/3-player/9-state/player-atoms.ts';
import { overviewWaveformAtom, waveformAudioStreamAtom, waveformEnabledAtom, waveformsAtom } from '../9-state/timeline-atoms.ts';

// Port of upstream useWaveform

const maxWaveforms = 100;
const color = '#ffffff';

/** Updates the waveforms and revokes the object URLs that are no longer used */
function setWaveforms(fn: (existing: WaveformSlice[]) => WaveformSlice[]) {
    const prev = appStore.get(waveformsAtom);
    const next = fn(prev);
    const usedUrls = new Set(next.flatMap((w) => (w.url != null ? [w.url] : [])));
    for (const waveform of prev) {
        if (waveform.url != null && !usedUrls.has(waveform.url)) {
            console.log('Cleanup waveform', waveform.from, waveform.to);
            URL.revokeObjectURL(waveform.url);
        }
    }
    appStore.set(waveformsAtom, next);
}

function setOverviewWaveformUrl(url: string | undefined) {
    const prev = appStore.get(overviewWaveformAtom);
    if (prev != null) {
        console.log('Cleanup overview waveform');
        URL.revokeObjectURL(prev.url);
    }
    appStore.set(overviewWaveformAtom, url != null ? { createdAt: new Date(), url } : undefined);
}

function resetWaveforms() {
    setWaveforms(() => []);
    setOverviewWaveformUrl(undefined);
}

observe((get) => {
    get(filePathAtom);
    get(waveformAudioStreamAtom);
    resetWaveforms();
}, appStore);

onFileReset(resetWaveforms);

// Keeps rendering the waveform windows around the playback position. The position is polled (not subscribed) because it changes every frame
observe((get) => {
    const filePath = get(filePathAtom);
    const fileDuration = get(fileDurationAtom);
    const audioStream = get(waveformAudioStreamAtom);
    const waveformEnabled = get(waveformEnabledAtom);

    if (!filePath || fileDuration == null || !audioStream || !waveformEnabled) return undefined;

    let aborted = false;

    (async () => {
        while (!aborted) {
            const waveformStartTime = Math.floor(appStore.get(relevantTimeAtom) / ffmpegExtractWindow) * ffmpegExtractWindow;
            const times = [
                waveformStartTime,
                waveformStartTime + ffmpegExtractWindow,
                waveformStartTime - ffmpegExtractWindow,
            ];

            for (const time of times) {
                const safeExtractDuration = Math.min(time + ffmpegExtractWindow, fileDuration) - time;
                const alreadyHaveWaveformAtTime = appStore.get(waveformsAtom).some((waveform) => waveform.from === time);
                if (!alreadyHaveWaveformAtTime && time >= 0 && time < fileDuration) {
                    try {
                        const promise = renderWaveformPng({ filePath, start: time, duration: safeExtractDuration, color, streamIndex: audioStream.index, timeout: 10000 });

                        setWaveforms((currentWaveforms) => {
                            const waveformsByCreatedAt = sortBy(currentWaveforms, 'createdAt');
                            return [
                                // If too many waveforms, cleanup old
                                ...(currentWaveforms.length >= maxWaveforms ? waveformsByCreatedAt.slice(1) : waveformsByCreatedAt),
                                { from: time, to: time + safeExtractDuration, duration: safeExtractDuration, createdAt: new Date() },
                            ];
                        });

                        const { buffer } = await promise;

                        if (aborted) {
                            // remove unfinished waveform
                            setWaveforms((currentWaveforms) => currentWaveforms.filter((w) => w.from !== time));
                            return;
                        }

                        const url = URL.createObjectURL(safeCreateBlob(buffer, { type: 'image/png' }));
                        setWaveforms((currentWaveforms) => currentWaveforms.map((w) => (w.from === time ? { ...w, url } : w)));
                    } catch (err) {
                        console.error('Failed to render waveform', err);
                        setWaveforms((currentWaveforms) => currentWaveforms.map((w) => (w.from === time ? { ...w, failed: true } : w)));
                    }
                }
            }

            // could be problematic if we spawn ffmpeg processes too often, so throttle it
            await new Promise((r) => setTimeout(r, 100));
        }
    })();

    return () => {
        aborted = true;
    };
}, appStore);

async function renderOverviewWaveform() {
    const filePath = appStore.get(filePathAtom);
    const audioStream = appStore.get(waveformAudioStreamAtom);
    invariant(filePath != null);
    invariant(audioStream != null);

    // todo allow actual abort
    const { buffer } = await renderWaveformPng({ filePath, color, streamIndex: audioStream.index, resample: 10000 });
    setOverviewWaveformUrl(URL.createObjectURL(safeCreateBlob(buffer, { type: 'image/png' })));
}

export async function generateOverviewWaveform() {
    if (isWorking()) return;
    try {
        setWorking({ text: i18n.t('Generating full overview waveform, this may take a few minutes.') });
        await renderOverviewWaveform();
    } finally {
        setWorking(undefined);
    }
}
