import { observe } from 'jotai-effect';
import { appStore } from '@/components/4-dialogs/7-0-dialogs/store.ts';
import { onFileReset } from '@/editor/0-core/7-actions/lifecycle.ts';
import { renderThumbnails } from '@/editor/0-core/8-lib/ffmpeg/ffmpeg.ts';
import { isAbortedError } from '@/editor/0-core/8-lib/util.ts';
import { filePathAtom } from '@/editor/2-file/9-state/a-file-atoms.ts';
import { isDurationValid } from '@/editor/5-segments/8-lib/segments.ts';
import { showThumbnailsAtom, thumbnailsAtom, zoomedDurationAtom, zoomWindowStartTimeAtom } from '../9-state/timeline-atoms.ts';

// Port of upstream useThumbnails: renders a strip of thumbnails for the visible (zoomed) window

let current: { key: string; abortController: AbortController; urls: string[]; } | undefined;

function stopThumbnails() {
    if (current == null) return;
    current.abortController.abort();
    if (current.urls.length > 0) console.log('Cleanup thumbnails', current.urls.length);
    current.urls.forEach((url) => URL.revokeObjectURL(url));
    current = undefined;
    appStore.set(thumbnailsAtom, []);
}

function startThumbnails(params: { zoomedDuration: number | undefined; filePath: string | undefined; zoomWindowStartTime: number; showThumbnails: boolean; }) {
    const key = JSON.stringify(params);
    if (current?.key === key) return;
    stopThumbnails();

    const { zoomedDuration, filePath, zoomWindowStartTime, showThumbnails } = params;
    if (!isDurationValid(zoomedDuration) || !showThumbnails || filePath == null) return;

    const run = { key, abortController: new AbortController(), urls: [] as string[] };
    current = run;
    const { signal } = run.abortController;

    renderThumbnails({
        signal,
        filePath,
        from: zoomWindowStartTime,
        duration: zoomedDuration,
        onThumbnail: (thumbnail) => {
            if (signal.aborted) { // because the bridge is async
                URL.revokeObjectURL(thumbnail.url);
                return;
            }
            run.urls.push(thumbnail.url);
            appStore.set(thumbnailsAtom, (v) => [...v, thumbnail]);
        },
    }).catch((err: unknown) => {
        if (!isAbortedError(err)) {
            console.error('Failed to render thumbnails', err);
        }
    });
}

export function initThumbnails() {
    // debounced like upstream (300ms)
    observe((get) => {
        const params = {
            zoomedDuration: get(zoomedDurationAtom),
            filePath: get(filePathAtom),
            zoomWindowStartTime: get(zoomWindowStartTimeAtom),
            showThumbnails: get(showThumbnailsAtom),
        };
        const timer = setTimeout(() => startThumbnails(params), 300);
        return () => clearTimeout(timer);
    }, appStore);

    onFileReset(stopThumbnails);
}
