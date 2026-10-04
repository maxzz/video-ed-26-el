import { observe } from 'jotai-effect';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { preloadEnv } from '@/editor/0-core/8-lib/main-api.ts';
import { cacheBusterAtom, effectiveFilePathAtom } from '@/editor/2-file/9-state/file-atoms.ts';
import { playbackVolumeAtom, videoElementAtom } from '../9-state/player-atoms.ts';

function getMediaUrl(path: string, cacheBuster: number) {
    const baseUrl = preloadEnv.toMediaUrl(path);
    // https://github.com/mifi/lossless-cut/issues/1674
    if (cacheBuster === 0) return baseUrl;
    const qs = new URLSearchParams();
    qs.set('t', String(cacheBuster));
    return `${baseUrl}?${qs.toString()}`;
}

// Load the (preview) file into the <video> element
observe((get) => {
    const video = get(videoElementAtom);
    const effectiveFilePath = get(effectiveFilePathAtom);
    const cacheBuster = get(cacheBusterAtom);
    if (!video || !effectiveFilePath) return undefined;

    video.src = getMediaUrl(effectiveFilePath, cacheBuster);

    return () => {
        // Apparently this is the correct way to unload a video
        // See commit 260603f613632850c301f72f0fca267b06b688a0 and https://github.com/mifi/lossless-cut/issues/2907
        video.pause();
        video.removeAttribute('src');
        video.load();
    };
}, appStore);

observe((get) => {
    const video = get(videoElementAtom);
    if (video) video.volume = get(playbackVolumeAtom);
}, appStore);
