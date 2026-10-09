import pMap from "p-map";

import { fs } from "@/editor/0-core/8-lib/node-shims";

import { userSettings } from "@/editor/0-core/9-state/user-settings";

import * as ffmpeg from "@/editor/0-core/8-lib/ffmpeg/ff-remote";

import { type CaptureFormat } from "@shared/types";
import { formatTimecode } from "@/editor/0-core/9-state/timecode";
import { assertFileExists, escapeRegExp, fsOperationWithRetry, getOutDir, getOutPath, getSuffixedFileName, getSuffixedOutPath, transferTimestamps } from "@/editor/0-core/8-lib/util";
import { getNumDigits, isDurationValid } from "@/editor/5-segments/8-lib/segment-utils";
import { appendFfmpegCommandLog } from "@/editor/7-export/9-state/export-atoms";

// Port of upstream useFrameCapture

export async function captureFramesRange({ customOutDir, filePath, fps, fromTime, toTime, estimatedMaxNumFiles, captureFormat, quality, filter, onProgress, outputTimestamps }: {
    customOutDir: string | undefined;
    filePath: string;
    fps: number;
    fromTime: number;
    toTime: number | undefined;
    estimatedMaxNumFiles: number;
    captureFormat: CaptureFormat;
    quality: number;
    filter?: string | undefined;
    onProgress: (a: number) => void;
    outputTimestamps: boolean;
}) {
    // fail fast with a helpful message if the source file has been moved/deleted since it was opened
    await assertFileExists(filePath);

    const getSuffix = (prefix: string) => `${prefix}.${captureFormat}`;

    if (!outputTimestamps) {
        const numDigits = getNumDigits(estimatedMaxNumFiles);
        const outPathTemplate = getSuffixedOutPath({ customOutDir, filePath, nameSuffix: getSuffix(`%0${numDigits}d`) });
        const firstFileOutPath = getSuffixedOutPath({ customOutDir, filePath, nameSuffix: getSuffix(`${'1'.padStart(numDigits, '0')}`) }); // mimic ffmpeg output

        const args = await ffmpeg.captureFrames({ from: fromTime, to: toTime, videoPath: filePath, outPathTemplate, captureFormat, quality, filter, onProgress });
        appendFfmpegCommandLog(args);

        return firstFileOutPath;
    }

    // capture frames with timestamps
    // see https://github.com/mifi/lossless-cut/issues/1139

    const tmpSuffix = 'llc-tmp-frame-capture-';
    const outPathTemplate = getSuffixedOutPath({ customOutDir, filePath, nameSuffix: getSuffix(`${tmpSuffix}%d`) });
    const args = await ffmpeg.captureFrames({ from: fromTime, to: toTime, videoPath: filePath, outPathTemplate, captureFormat, quality, filter, framePts: true, onProgress });
    appendFfmpegCommandLog(args);

    const outDir = getOutDir(customOutDir, filePath);
    const files = await fs.readdir(outDir);

    const regexp = new RegExp(`^${escapeRegExp(getSuffixedFileName(filePath, tmpSuffix))}(\\d+)`);
    const matches = files.flatMap((fileName) => {
        const match = fileName.match(regexp);
        if (!match) {
            return [];
        }
        const frameNum = parseInt(match[1]!, 10);
        if (Number.isNaN(frameNum) || frameNum < 0) {
            return [];
        }
        return [{ fileName, frameNum }];
    });

    console.log('Renaming temp files...');

    const outPaths = await pMap(matches,
        async ({ fileName, frameNum }) => {
            const duration = formatTimecode({ seconds: fromTime + (frameNum / fps), fileNameFriendly: true });
            const renameFromPath = getOutPath({ customOutDir, filePath, fileName });
            const renameToPath = getOutPath({ customOutDir, filePath, fileName: getSuffixedFileName(filePath, getSuffix(duration)) });
            await fsOperationWithRetry(async () => fs.rename(renameFromPath, renameToPath));
            return renameToPath;
        },
        { concurrency: 1 }
    );

    return outPaths[0];
}

export async function captureFrameFromFfmpeg({ customOutDir, filePath, time, captureFormat, quality, fileDuration }: {
    customOutDir?: string | undefined;
    filePath: string;
    time: number;
    captureFormat: CaptureFormat;
    quality: number;
    fileDuration: number | undefined;
}) {
    await assertFileExists(filePath);

    const timecode = formatTimecode({ seconds: time, fileNameFriendly: true });
    const nameSuffix = `${timecode}.${captureFormat}`;
    const outPath = getSuffixedOutPath({ customOutDir, filePath, nameSuffix });
    const args = await ffmpeg.captureFrameToFile({ timestamp: time, videoPath: filePath, outPath, quality });
    appendFfmpegCommandLog(args);

    await transferCaptureTimestamps({ filePath, outPath, time, fileDuration });
    return outPath;
}

export async function captureFrameFromTag({ customOutDir, filePath, time, captureFormat, quality, video, fileDuration }: {
    customOutDir?: string | undefined;
    filePath: string;
    time: number;
    captureFormat: CaptureFormat;
    quality: number;
    video: HTMLVideoElement;
    fileDuration: number | undefined;
}) {
    const { data, ext } = await getFrameFromVideo(video, captureFormat, quality);

    const timecode = formatTimecode({ seconds: time, fileNameFriendly: true });
    const outPath = getSuffixedOutPath({ customOutDir, filePath, nameSuffix: `${timecode}.${ext}` });
    await fs.writeFile(outPath, data);

    await transferCaptureTimestamps({ filePath, outPath, time, fileDuration });
    return outPath;
}

export const captureFrameToClipboard = async ({ filePath, time, quality }: { filePath: string; time: number; quality: number; }) => (
    ffmpeg.captureFrameToClipboard({ timestamp: time, videoPath: filePath, quality })
);

const extensionByFormat: Record<CaptureFormat, string> = { jpeg: 'jpeg', png: 'png', webp: 'webp' };

async function getFrameFromVideo(video: HTMLVideoElement, format: CaptureFormat, quality: number) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, `image/${format}`, quality));
    if (blob == null) {
        throw new Error('Failed to capture frame from video element');
    }
    // Chromium silently falls back to png for unsupported formats, so derive the extension from what we got
    const actualFormat = (blob.type.replace(/^image\//, '') || format) as CaptureFormat;
    return { data: new Uint8Array(await blob.arrayBuffer()), ext: extensionByFormat[actualFormat] ?? actualFormat };
}

function transferCaptureTimestamps({ filePath, outPath, time, fileDuration }: { filePath: string; outPath: string; time: number; fileDuration: number | undefined; }) {
    return transferTimestamps({
        inPath: filePath,
        outPath,
        cutFrom: time,
        cutTo: time,
        duration: isDurationValid(fileDuration) ? fileDuration : undefined,
        treatInputFileModifiedTimeAsStart: userSettings.treatInputFileModifiedTimeAsStart,
        treatOutputFileModifiedTimeAsStart: userSettings.treatOutputFileModifiedTimeAsStart,
    });
}
