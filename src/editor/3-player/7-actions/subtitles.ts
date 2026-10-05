import { observe } from 'jotai-effect';
import i18n from 'i18next';
import invariant from 'tiny-invariant';
import type { FFprobeStream } from '@shared/ffprobe';
import { appStore } from '@/components/4-dialogs/7-0-dialogs/store.ts';
import { isWorking, setWorking, withErrorHandling } from '@/editor/0-core/9-state/working.ts';
import { extractSubtitleTrackVtt } from '@/editor/0-core/8-lib/ffmpeg/ffmpeg.ts';
import { filePathAtom, subtitleStreamsAtom } from '@/editor/2-file/9-state/a-file-atoms.ts';
import { activeSubtitleStreamIndexAtom, subtitlesByStreamIdAtom } from '../9-state/player-atoms.ts';

// Port of upstream useSubtitles + onActiveSubtitleChange

export async function loadSubtitle({ filePath, index, subtitleStream }: { filePath: string; index: number; subtitleStream: FFprobeStream; }) {
    const url = await extractSubtitleTrackVtt(filePath, index);
    appStore.set(subtitlesByStreamIdAtom, (old) => ({ ...old, [index]: { url, lang: subtitleStream.tags?.language } }));
}

export async function onActiveSubtitleChange(index?: number) {
    if (index == null) {
        appStore.set(activeSubtitleStreamIndexAtom, undefined);
        return;
    }
    if (appStore.get(subtitlesByStreamIdAtom)[index]) { // Already loaded
        appStore.set(activeSubtitleStreamIndexAtom, index);
        return;
    }
    const subtitleStream = appStore.get(subtitleStreamsAtom).find((s) => s.index === index);
    if (!subtitleStream || isWorking()) return;

    setWorking({ text: i18n.t('Loading subtitle') });
    try {
        await withErrorHandling(async () => {
            const filePath = appStore.get(filePathAtom);
            invariant(filePath != null);
            await loadSubtitle({ filePath, index, subtitleStream });
            appStore.set(activeSubtitleStreamIndexAtom, index);
        }, i18n.t('Failed to load subtitles from track {{index}}', { index }));
    } finally {
        setWorking(undefined);
    }
}

export function initSubtitleEffects() {
    // Cleanup removed subtitles
    let previousSubtitles: Record<number, { url: string; lang?: string | undefined; }> = {};
    observe((get) => {
        const subtitlesByStreamId = get(subtitlesByStreamIdAtom);
        const current = Object.values(subtitlesByStreamId);
        Object.values(previousSubtitles).forEach(({ url, lang }) => {
            if (!current.some((existingSubtitle) => existingSubtitle.url === url)) {
                console.log('Cleanup subtitle', lang);
                URL.revokeObjectURL(url);
            }
        });
        previousSubtitles = subtitlesByStreamId;
    }, appStore);
}
