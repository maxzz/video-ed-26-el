import { atom } from "jotai";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";

import { type FFprobeStream } from "@shared/ffprobe";
import { type Html5ifyMode } from "@shared/types";
import { type BatchFile, type FfmpegCommandLog, type FileStats, type FilesMeta, type ParamsByFile } from "@/editor/0-core/8-lib/9-types-core";
import { type FileFfprobeMeta } from "@/editor/0-core/8-lib/ffmpeg/ffmpeg";

import { getAudioStreams, getRealVideoStreams, getSubtitleStreams } from "@/editor/0-core/8-lib/ffmpeg/streams";
import { isDurationValid } from "@/editor/5-segments/8-lib/segment-utils";
import { getOutDir } from "@/editor/0-core/8-lib/util";
import { customOutDirAtom } from "@/editor/0-core/9-state/user-settings";
import { setProgress } from "@/editor/0-core/9-state/working";
import { onFileReset } from "@/editor/0-core/7-actions/2-lifecycle";

// Per project (per opened file) state. Reset by resetAllFileState() (see 0-core/7-actions/lifecycle.ts).

export const filePathAtom = atom<string | undefined>(undefined);
export const fileDurationAtom = atom<number | undefined>(undefined);
export const mainFileMetaAtom = atom<{ ffprobeMeta: FileFfprobeMeta; stats: FileStats; } | undefined>(undefined);
export const externalFilesMetaAtom = atom<FilesMeta>({});
export const paramsByFileAtom = atom<ParamsByFile>(new Map());
export const detectedFpsAtom = atom<number | undefined>(undefined);
export const detectedFileFormatAtom = atom<string | undefined>(undefined);
export const fileFormatAtom = atom<string | undefined>(undefined);
/** 360 means we don't modify rotation */
export const rotationAtom = atom(360);
export const startTimeOffsetAtom = atom(0);
export const shortestFlagAtom = atom(false);
export const cacheBusterAtom = atom(0);
export const currentFileExportCountAtom = atom(0);
/** Html5ified preview file used for playback instead of the source file */
export const previewFilePathAtom = atom<string | undefined>(undefined);
export const usingDummyVideoAtom = atom(false);
export const encBitrateAtom = atom<number | undefined>(undefined);

// Per application launch state

export const exportCountAtom = atom(0);
export const ffmpegCommandLogAtom = atom<FfmpegCommandLog>([]);
export const lastOpenedPathAtom = atom<string | undefined>(undefined);
export const ffmpegInfoAtom = atom<{ program_version: { version: string; }; } | undefined>(undefined);
export const alwaysConcatMultipleFilesAtom = atom(false);
/** Html5ify mode the user asked to use for all files until the app is restarted */
export const rememberConvertToSupportedFormatAtom = atom<Html5ifyMode | undefined>(undefined);

// Batch file list

export const batchFilesAtom = atom<BatchFile[]>([]);
export const selectedBatchFilesAtom = atom<string[]>([]);
export const batchFilePathsAtom = atom((get) => get(batchFilesAtom).map((f) => f.path));

// Derived

export const isFileOpenedAtom = atom((get) => !!get(filePathAtom));
export const isCustomFormatSelectedAtom = atom((get) => get(fileFormatAtom) !== get(detectedFileFormatAtom));
export const effectiveFilePathAtom = atom((get) => get(previewFilePathAtom) || get(filePathAtom));
export const usingPreviewFileAtom = atom((get) => !!get(previewFilePathAtom));

export const fileDurationNonZeroAtom = atom((get) => {
    const fileDuration = get(fileDurationAtom);
    return isDurationValid(fileDuration) ? fileDuration : 1;
});

const emptyStreams: FFprobeStream[] = [];
export const mainStreamsAtom = atom((get) => get(mainFileMetaAtom)?.ffprobeMeta.streams ?? emptyStreams);
export const mainFileFormatDataAtom = atom((get) => get(mainFileMetaAtom)?.ffprobeMeta.format);
export const mainFileChaptersAtom = atom((get) => get(mainFileMetaAtom)?.ffprobeMeta.chapters);

export const subtitleStreamsAtom = atom((get) => getSubtitleStreams(get(mainStreamsAtom)));
export const videoStreamsAtom = atom((get) => getRealVideoStreams(get(mainStreamsAtom)));
export const audioStreamsAtom = atom((get) => getAudioStreams(get(mainStreamsAtom)));
export const mainVideoStreamAtom = atom((get) => get(videoStreamsAtom)[0]);
export const mainAudioStreamAtom = atom((get) => get(audioStreamsAtom)[0]);
export const hasAudioAtom = atom((get) => !!get(mainAudioStreamAtom));
export const hasVideoAtom = atom((get) => !!get(mainVideoStreamAtom));

export const allFilesMetaAtom = atom((get) => {
    const filePath = get(filePathAtom);
    const mainFileMeta = get(mainFileMetaAtom);
    return {
        ...get(externalFilesMetaAtom),
        ...(filePath && mainFileMeta != null ? { [filePath]: mainFileMeta.ffprobeMeta } : {}),
    };
});

/** total number of streams for ALL files */
export const numStreamsTotalAtom = atom((get) => Object.values(get(allFilesMetaAtom)).flatMap(({ streams }) => streams).length);

export const isRotationSetAtom = atom((get) => get(rotationAtom) !== 360);

export const outputDirAtom = atom((get) => getOutDir(get(customOutDirAtom), get(filePathAtom)));

onFileReset(
    () => {
        jotaiDefaultStore.set(previewFilePathAtom, undefined);
        jotaiDefaultStore.set(usingDummyVideoAtom, false);
        jotaiDefaultStore.set(fileDurationAtom, undefined);
        jotaiDefaultStore.set(detectedFileFormatAtom, undefined);
        jotaiDefaultStore.set(rotationAtom, 360);
        setProgress(undefined);
        jotaiDefaultStore.set(startTimeOffsetAtom, 0);
        jotaiDefaultStore.set(filePathAtom, undefined);
        jotaiDefaultStore.set(externalFilesMetaAtom, {});
        jotaiDefaultStore.set(paramsByFileAtom, new Map());
        jotaiDefaultStore.set(detectedFpsAtom, undefined);
        jotaiDefaultStore.set(mainFileMetaAtom, undefined);
        jotaiDefaultStore.set(shortestFlagAtom, false);
        jotaiDefaultStore.set(currentFileExportCountAtom, 0);
    }
);
