import { nanoid } from 'nanoid';
import type { CaptureFormat, FfmpegHwAccel } from '@shared/types.ts';
import type { DetectedSegment, FfRunOptions } from '@shared/ipc-contract.ts';
import { getFfCommandLine, mainApi, mainEvents } from '../../7-actions/0-main-api.ts';

// Renderer-side facade over the main-process ffmpeg service (electron/main/ffmpeg).
// Mirrors the function names LosslessCut's renderer used through @electron/remote.

export { getFfCommandLine };

type OnProgress = (progress: number) => void;

/** Subscribes to progress events for a job for the duration of `fn` */
async function withJob<T>(onProgress: OnProgress | undefined, signal: AbortSignal | undefined, fn: (jobId: string) => Promise<T>, onSegment?: (segment: DetectedSegment) => void) {
    const jobId = nanoid();
    const offProgress = onProgress ? mainEvents.on('ffProgress', (id, progress) => id === jobId && onProgress(progress)) : undefined;
    const offSegment = onSegment ? mainEvents.on('ffSegmentDetected', (id, segment) => id === jobId && onSegment(segment)) : undefined;
    const onAbort = () => mainApi.ffAbortJob(jobId);
    signal?.addEventListener('abort', onAbort);
    try {
        return await fn(jobId);
    } finally {
        offProgress?.();
        offSegment?.();
        signal?.removeEventListener('abort', onAbort);
    }
}

export async function runFfmpeg(args: string[], options?: Omit<FfRunOptions, 'jobId'> & { signal?: AbortSignal | undefined; }) {
    const { signal, ...rest } = options ?? {};
    return withJob(undefined, signal, (jobId) => mainApi.ffRun('ffmpeg', args, { ...rest, jobId }));
}

export async function runFfprobe(args: string[], options?: { logCli?: boolean; timeout?: number; }) {
    return mainApi.ffRun('ffprobe', args, options);
}

export async function runFfmpegWithProgress({ ffmpegArgs, duration, onProgress, signal }: { ffmpegArgs: string[]; duration?: number | undefined; onProgress: OnProgress; signal?: AbortSignal; }) {
    return withJob(onProgress, signal, (jobId) => mainApi.ffRun('ffmpeg', ffmpegArgs, { jobId, ...(duration != null && { duration }) }));
}

export async function runFfmpegConcat({ ffmpegArgs, concatTxt, totalDuration, onProgress }: { ffmpegArgs: string[]; concatTxt: string; totalDuration: number; onProgress: OnProgress; }) {
    return withJob(onProgress, undefined, (jobId) => mainApi.ffRun('ffmpeg', ffmpegArgs, { jobId, duration: totalDuration, stdinText: concatTxt }));
}

export const abortFfmpegs = async () => mainApi.ffAbortAll();

export async function renderWaveformPng(params: { filePath: string; start?: number; duration?: number; resample?: number; color: string; streamIndex: number; timeout?: number; }) {
    return { buffer: await mainApi.ffRenderWaveformPng(params) };
}

export async function getDuration(filePath: string) {
    const { stdout } = await runFfprobe(['-of', 'json', '-show_format', '-i', filePath, '-hide_banner']);
    const duration = (JSON.parse(stdout) as { format: { duration?: string; }; }).format.duration;
    return duration != null ? parseFloat(duration) : undefined;
}

interface DetectParams {
    filePath: string;
    streamId: number | undefined;
    from: number;
    to: number;
    ffmpegHwaccel: FfmpegHwAccel;
    onProgress: OnProgress;
    onSegmentDetected: (segment: DetectedSegment) => void;
    signal?: AbortSignal;
}

export async function detectSceneChanges({ onProgress, onSegmentDetected, signal, ...params }: DetectParams & { minChange: number | string; }) {
    const { command } = await withJob(onProgress, signal, (jobId) => mainApi.ffDetectSceneChanges({ ...params, jobId }), onSegmentDetected);
    return { ffmpegCommand: command };
}

export async function blackDetect({ onProgress, onSegmentDetected, signal, ...params }: DetectParams & { filterOptions: Record<string, string>; boundingMode: boolean; }) {
    const { command } = await withJob(onProgress, signal, (jobId) => mainApi.ffBlackDetect({ ...params, jobId }), onSegmentDetected);
    return { ffmpegCommand: command };
}

export async function silenceDetect({ onProgress, onSegmentDetected, signal, ...params }: DetectParams & { filterOptions: Record<string, string>; boundingMode: boolean; }) {
    const { command } = await withJob(onProgress, signal, (jobId) => mainApi.ffSilenceDetect({ ...params, jobId }), onSegmentDetected);
    return { ffmpegCommand: command };
}

export async function captureFrames({ onProgress, ...params }: { from: number; to?: number | undefined; videoPath: string; outPathTemplate: string; quality: number; filter?: string | undefined; framePts?: boolean | undefined; captureFormat: CaptureFormat; onProgress: OnProgress; }) {
    return withJob(onProgress, undefined, (jobId) => mainApi.ffCaptureFrames({ ...params, jobId }));
}

export const captureFrameToFile = async (params: { timestamp: number; videoPath: string; outPath: string; quality: number; }) => mainApi.ffCaptureFrameToFile(params);

export const captureFrameToClipboard = async (params: { timestamp: number; videoPath: string; quality: number; }) => mainApi.ffCaptureFrameToClipboard(params);

export function mapTimesToSegments(times: number[], includeLast: boolean) {
    const segments: { start: number; end: number | undefined; }[] = [];
    for (let i = 0; i < times.length; i += 1) {
        const start = times[i];
        const end = times[i + 1];
        if (start != null) {
            if (end != null) {
                segments.push({ start, end });
            } else if (includeLast) {
                segments.push({ start, end }); // end undefined means until end of video
            }
        }
    }
    return segments;
}
