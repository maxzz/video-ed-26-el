import { atom } from 'jotai';
import pMap from 'p-map';
import invariant from 'tiny-invariant';
import type { FFprobeStream } from '@shared/ffprobe';
import { appStore } from '@/editor/0-core/0-state/store.ts';
import { userSettingsAtom } from '@/editor/0-core/0-state/user-settings.ts';
import { onFileReset } from '@/editor/0-core/1-actions/lifecycle.ts';
import { isStreamThumbnail, shouldCopyStreamByDefault } from '@/editor/0-core/2-lib/ffmpeg/streams.ts';
import safeishEval from '@/editor/0-core/2-lib/eval/eval.ts';
import { externalFilesMetaAtom, filePathAtom, mainStreamsAtom } from '@/editor/2-file/0-state/file-atoms.ts';

// Port of upstream useStreamsMeta: which streams of which files are copied to the output.

export type CopyStreamIds = Record<string, boolean>;
export type CopyStreamIdsByFile = Record<string, CopyStreamIds>;

export const copyStreamIdsByFileAtom = atom<CopyStreamIdsByFile>({});
/** Remembered between files */
export const enabledStreamsFilterAtom = atom<string | undefined>(undefined);

onFileReset(() => appStore.set(copyStreamIdsByFileAtom, {}));

export function isCopyingStreamIdIn(copyStreamIdsByFile: CopyStreamIdsByFile, path: string | undefined, streamId: number) {
    return !!((path != null && copyStreamIdsByFile[path]) || {})[streamId];
}

export function isCopyingStreamId(path: string | undefined, streamId: number) {
    return isCopyingStreamIdIn(appStore.get(copyStreamIdsByFileAtom), path, streamId);
}

export const mainCopiedStreamsAtom = atom((get) => {
    const copyStreamIdsByFile = get(copyStreamIdsByFileAtom);
    const filePath = get(filePathAtom);
    return get(mainStreamsAtom).filter((stream) => isCopyingStreamIdIn(copyStreamIdsByFile, filePath, stream.index));
});

export const mainCopiedThumbnailStreamsAtom = atom((get) => get(mainCopiedStreamsAtom).filter((stream) => isStreamThumbnail(stream)));

/** Streams that are not copy enabled by default */
const extraStreamsAtom = atom((get) => get(mainStreamsAtom).filter((stream) => !shouldCopyStreamByDefault(stream)));

/** Extra streams that the user has not selected for copy */
export const nonCopiedExtraStreamsAtom = atom((get) => {
    const copyStreamIdsByFile = get(copyStreamIdsByFileAtom);
    const filePath = get(filePathAtom);
    return get(extraStreamsAtom).filter((stream) => !isCopyingStreamIdIn(copyStreamIdsByFile, filePath, stream.index));
});

export const exportExtraStreamsAtom = atom((get) => get(userSettingsAtom).autoExportExtraStreams && get(nonCopiedExtraStreamsAtom).length > 0);

export const copyFileStreamsAtom = atom((get) => Object.entries(get(copyStreamIdsByFileAtom)).map(([path, streamIdsMap]) => ({
    path,
    streamIds: Object.entries(streamIdsMap).filter(([, shouldCopy]) => shouldCopy).map(([streamIdStr]) => parseInt(streamIdStr, 10)),
})));

/** total number of streams to copy for ALL files */
export const numStreamsToCopyAtom = atom((get) => get(copyFileStreamsAtom).reduce((acc, { streamIds }) => acc + streamIds.length, 0));

export function setCopyStreamIdsByFile(value: CopyStreamIdsByFile) {
    appStore.set(copyStreamIdsByFileAtom, value);
}

export function setCopyStreamIdsForPath(path: string, cb: (old: CopyStreamIds) => CopyStreamIds) {
    appStore.set(copyStreamIdsByFileAtom, (old) => ({ ...old, [path]: cb(old[path] || {}) }));
}

function toggleCopyStreamIdsInternal(path: string, streams: FFprobeStream[]) {
    setCopyStreamIdsForPath(path, (old) => {
        const ret = { ...old };
        streams.forEach(({ index }) => {
            ret[index] = !ret[index];
        });
        return ret;
    });
}

export function toggleCopyStreamIds(path: string, filter: (a: FFprobeStream) => boolean) {
    const streams = path === appStore.get(filePathAtom) ? appStore.get(mainStreamsAtom) : appStore.get(externalFilesMetaAtom)[path]?.streams;
    if (!streams) return;
    toggleCopyStreamIdsInternal(path, streams.filter((stream) => filter(stream)));
}

export async function filterEnabledStreams(expr: string) {
    return (await pMap(appStore.get(mainStreamsAtom), async (stream) => (
        (await safeishEval(expr, { track: stream })) === true ? [stream] : []
    ), { concurrency: 5 })).flat();
}

export async function applyEnabledStreamsFilter(expr = appStore.get(enabledStreamsFilterAtom)) {
    if (expr == null) return;
    const filePath = appStore.get(filePathAtom);
    invariant(filePath != null);
    toggleCopyStreamIdsInternal(filePath, await filterEnabledStreams(expr));
}

function toggleStripCodecType(codecType: FFprobeStream['codec_type']) {
    toggleCopyStreamIds(appStore.get(filePathAtom)!, (stream) => stream.codec_type === codecType);
}

export const toggleStripAudio = () => toggleStripCodecType('audio');
export const toggleStripVideo = () => toggleStripCodecType('video');
export const toggleStripSubtitle = () => toggleStripCodecType('subtitle');
export const toggleStripThumbnail = () => toggleCopyStreamIds(appStore.get(filePathAtom)!, isStreamThumbnail);
export const toggleCopyAllStreamsForPath = (path: string) => toggleCopyStreamIds(path, () => true);

export function toggleStripAll() {
    const filePath = appStore.get(filePathAtom);
    invariant(filePath != null);
    const mainStreams = appStore.get(mainStreamsAtom);
    setCopyStreamIdsForPath(filePath, (old) => {
        const someSelected = mainStreams.some(({ index }) => old[index]);
        return {
            ...old,
            ...Object.fromEntries(mainStreams.map(({ index }) => [index, !someSelected])),
        };
    });
}

export function toggleCopyStreamId(path: string, index: number) {
    setCopyStreamIdsForPath(path, (old) => ({ ...old, [index]: !old[index] }));
}
