import { atom } from 'jotai';
import pMap from 'p-map';
import invariant from 'tiny-invariant';
import type { FFprobeStream } from '@shared/ffprobe';
import { jotaiDefaultStore } from '@/utils/local-utils/9-jotai-default-store';
import { userSettingsAtom } from '@/editor/0-core/9-state/user-settings.ts';
import { onFileReset } from '@/editor/0-core/7-actions/2-lifecycle';
import { isStreamThumbnail, shouldCopyStreamByDefault } from '@/editor/0-core/8-lib/ffmpeg/streams.ts';
import safeishEval from '@/editor/0-core/8-lib/eval/eval.ts';
import { externalFilesMetaAtom, filePathAtom, mainStreamsAtom } from '@/editor/2-file/9-state/a-file-atoms';

// Port of upstream useStreamsMeta: which streams of which files are copied to the output.

export type CopyStreamIds = Record<string, boolean>;
export type CopyStreamIdsByFile = Record<string, CopyStreamIds>;

export const copyStreamIdsByFileAtom = atom<CopyStreamIdsByFile>({});
/** Remembered between files */
export const enabledStreamsFilterAtom = atom<string | undefined>(undefined);

onFileReset(() => jotaiDefaultStore.set(copyStreamIdsByFileAtom, {}));

export function isCopyingStreamIdIn(copyStreamIdsByFile: CopyStreamIdsByFile, path: string | undefined, streamId: number) {
    return !!((path != null && copyStreamIdsByFile[path]) || {})[streamId];
}

export function isCopyingStreamId(path: string | undefined, streamId: number) {
    return isCopyingStreamIdIn(jotaiDefaultStore.get(copyStreamIdsByFileAtom), path, streamId);
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
    jotaiDefaultStore.set(copyStreamIdsByFileAtom, value);
}

export function setCopyStreamIdsForPath(path: string, cb: (old: CopyStreamIds) => CopyStreamIds) {
    jotaiDefaultStore.set(copyStreamIdsByFileAtom, (old) => ({ ...old, [path]: cb(old[path] || {}) }));
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
    const streams = path === jotaiDefaultStore.get(filePathAtom) ? jotaiDefaultStore.get(mainStreamsAtom) : jotaiDefaultStore.get(externalFilesMetaAtom)[path]?.streams;
    if (!streams) return;
    toggleCopyStreamIdsInternal(path, streams.filter((stream) => filter(stream)));
}

export async function filterEnabledStreams(expr: string) {
    return (await pMap(jotaiDefaultStore.get(mainStreamsAtom), async (stream) => (
        (await safeishEval(expr, { track: stream })) === true ? [stream] : []
    ), { concurrency: 5 })).flat();
}

export async function applyEnabledStreamsFilter(expr = jotaiDefaultStore.get(enabledStreamsFilterAtom)) {
    if (expr == null) return;
    const filePath = jotaiDefaultStore.get(filePathAtom);
    invariant(filePath != null);
    toggleCopyStreamIdsInternal(filePath, await filterEnabledStreams(expr));
}

function toggleStripCodecType(codecType: FFprobeStream['codec_type']) {
    toggleCopyStreamIds(jotaiDefaultStore.get(filePathAtom)!, (stream) => stream.codec_type === codecType);
}

export const toggleStripAudio = () => toggleStripCodecType('audio');
export const toggleStripVideo = () => toggleStripCodecType('video');
export const toggleStripSubtitle = () => toggleStripCodecType('subtitle');
export const toggleStripThumbnail = () => toggleCopyStreamIds(jotaiDefaultStore.get(filePathAtom)!, isStreamThumbnail);
export const toggleCopyAllStreamsForPath = (path: string) => toggleCopyStreamIds(path, () => true);

export function toggleStripAll() {
    const filePath = jotaiDefaultStore.get(filePathAtom);
    invariant(filePath != null);
    const mainStreams = jotaiDefaultStore.get(mainStreamsAtom);
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
