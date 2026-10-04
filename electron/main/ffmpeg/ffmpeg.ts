import readline from 'node:readline';
import { Readable } from 'node:stream';
import assert from 'node:assert';
import { execa, type Options as ExecaOptions, type ResultPromise } from 'execa';
import type { CaptureFormat, FfmpegHwAccel } from '@shared/types.ts';
import type { CompatStreamParams, DetectedSegment, DetectOptions, FfCommand, FfRunOptions, FfRunResult } from '@shared/ipc-contract.ts';
import { getFfCommandLine as getFfCommandLineShared } from '@shared/ff-command-line.ts';
import { parseFfmpegProgressLine } from '@shared/progress.ts';
import { formatFfmpegNumber, getFixChannelLayoutFilter, getHwaccelArgs } from '@shared/util.ts';
import { getFfmpegJpegQuality } from '@shared/ffmpegUtil.ts';
import { isDev, isLinux, isWindows, writeClipboardImage } from '../util.ts';
import logger from '../logger.ts';
import { emitToRenderer } from '../events.ts';
import { getFfDir, getFfPath, hasCustomFfPath } from './paths.ts';

type BufferProcess = ResultPromise<{ encoding: 'buffer' }>;

/** Running ffmpeg processes; cannot use process.kill: https://github.com/sindresorhus/execa/issues/1177 */
const runningFfmpegs = new Set<{ abortController: AbortController; jobId: string | undefined; }>();

export const getFfCommandLine = (cmd: FfCommand, args: readonly string[]) => getFfCommandLineShared(cmd, args, isWindows);

export function abortAll() {
    logger.info('Aborting', runningFfmpegs.size, 'ffmpeg process(es)');
    runningFfmpegs.forEach((p) => p.abortController.abort());
}

export function abortJob(jobId: string) {
    runningFfmpegs.forEach((p) => {
        if (p.jobId === jobId) {
            p.abortController.abort();
        }
    });
}

function getEnv(): Record<string, string> {
    // https://github.com/mifi/lossless-cut/issues/1143#issuecomment-1500883489
    return isLinux && !hasCustomFfPath() ? { LD_LIBRARY_PATH: getFfDir() } : {};
}

function handleProgress(process: { stderr: Readable | null; }, duration: number | undefined, onProgress: (p: number) => void, customMatcher?: (line: string) => void) {
    if (process.stderr == null) {
        return;
    }
    onProgress(0);

    const rl = readline.createInterface({ input: process.stderr });
    rl.on('line', (line) => {
        try {
            const progress = parseFfmpegProgressLine({ line, customMatcher, duration });
            if (progress != null) {
                onProgress(progress);
            }
        } catch (err) {
            logger.error('Failed to parse ffmpeg progress line:', err instanceof Error ? err.message : err);
        }
    });
}

function progressEmitter(jobId: string | undefined) {
    return (progress: number) => {
        if (jobId != null) {
            emitToRenderer('ffProgress', jobId, progress);
        }
    };
}

function runFfmpegProcess(args: readonly string[], options: ExecaOptions = {}, { logCli = true, jobId }: { logCli?: boolean; jobId?: string | undefined; } = {}): BufferProcess {
    if (logCli) {
        logger.info(getFfCommandLine('ffmpeg', args));
    }

    const abortController = new AbortController();
    const process = execa(getFfPath('ffmpeg'), args, {
        ...options,
        env: getEnv(),
        cancelSignal: abortController.signal,
        encoding: 'buffer',
    } as ExecaOptions & { encoding: 'buffer'; }) as BufferProcess;

    const wrapped = { abortController, jobId };
    runningFfmpegs.add(wrapped);
    process.then(() => runningFfmpegs.delete(wrapped), () => runningFfmpegs.delete(wrapped));
    return process;
}

const decode = (data: unknown) => data instanceof Uint8Array ? new TextDecoder().decode(data) : String(data ?? '');

/** Generic runner used by the renderer for everything that produces text output */
export async function run(cmd: FfCommand, args: string[], { jobId, duration, stdinText, timeout, logCli = true }: FfRunOptions = {}): Promise<FfRunResult> {
    const command = getFfCommandLine(cmd, args);

    if (cmd === 'ffprobe') {
        if (logCli) {
            logger.info(command);
        }
        const ps = execa(getFfPath('ffprobe'), args, { env: getEnv(), encoding: 'buffer', timeout: timeout ?? (isDev ? 10000 : 30000) });
        const { stdout, stderr, exitCode } = await ps;
        return { stdout: decode(stdout), stderr: decode(stderr), exitCode, command };
    }

    const process = runFfmpegProcess(args, timeout != null ? { timeout } : {}, { logCli, jobId });
    if (duration != null && jobId != null) {
        handleProgress(process, duration, progressEmitter(jobId));
    }
    if (stdinText != null) {
        assert(process.stdin != null);
        Readable.from([stdinText]).pipe(process.stdin);
    }
    const { stdout, stderr, exitCode } = await process;
    return { stdout: decode(stdout), stderr: decode(stderr), exitCode, command };
}

export async function renderWaveformPng({ filePath, start, duration, resample, color, streamIndex, timeout }: {
    filePath: string;
    start?: number;
    duration?: number;
    resample?: number;
    color: string;
    streamIndex: number;
    timeout?: number;
}): Promise<Uint8Array> {
    const args1 = [
        '-hide_banner',
        '-i', filePath,
        '-vn',
        '-map', `0:${streamIndex}`,
        ...(start != null ? ['-ss', String(start)] : []),
        ...(duration != null ? ['-t', String(duration)] : []),
        ...(resample != null ? [
            // the operation is faster if we resample https://github.com/mifi/lossless-cut/issues/260#issuecomment-605603456
            '-c:a', 'pcm_s32le',
            '-ar', String(resample),
        ] : [
            '-c', 'copy',
            // we seek after the input, so keep leading non-keyframe packets, or else the waveform is shifted
            '-copyinkf',
        ]),
        '-f', 'matroska', // mpegts doesn't support vorbis etc
        '-',
    ];

    const args2 = [
        '-hide_banner',
        '-i', '-',
        '-filter_complex', `showwavespic=s=2000x300:scale=lin:filter=peak:split_channels=1:colors=${color}`,
        '-frames:v', '1',
        '-vcodec', 'png',
        '-f', 'image2',
        '-',
    ];

    logger.info(`${getFfCommandLine('ffmpeg', args1)} | \n${getFfCommandLine('ffmpeg', args2)}`);

    let ps1: BufferProcess | undefined;
    let ps2: BufferProcess | undefined;
    try {
        ps1 = runFfmpegProcess(args1, { buffer: false, ...(timeout != null && { timeout }) }, { logCli: false });
        ps2 = runFfmpegProcess(args2, timeout != null ? { timeout } : {}, { logCli: false });
        assert(ps1.stdout != null);
        assert(ps2.stdin != null);
        ps1.stdout.pipe(ps2.stdin);

        const { stdout } = await ps2;
        return new Uint8Array(stdout);
    } catch (err) {
        ps1?.kill();
        ps2?.kill();
        throw err;
    }
}

const getInputSeekArgs = ({ filePath, from, to }: { filePath: string; from?: number | undefined; to?: number | undefined; }) => [
    ...(from != null ? ['-ss', formatFfmpegNumber(from)] : []),
    '-i', filePath,
    ...(from != null && to != null ? ['-t', formatFfmpegNumber(to - from)] : []),
];

// https://stackoverflow.com/questions/35675529/using-ffmpeg-how-to-do-a-scene-change-detection-with-timecode
export async function detectSceneChanges({ jobId, filePath, streamId, minChange, from, to, ffmpegHwaccel }: DetectOptions & { minChange: number | string; }) {
    const args = [
        '-hide_banner',
        ...getHwaccelArgs(ffmpegHwaccel),
        ...getInputSeekArgs({ filePath, from, to }),
        '-map', streamId != null ? `0:${streamId}` : 'v:0',
        '-filter:v', `select='gt(scene,${minChange})',metadata=print:file=-:direct=1`, // direct=1 to flush stdout immediately
        '-f', 'null', '-',
    ];
    const process = runFfmpegProcess(args, { buffer: false }, { jobId });
    handleProgress(process, to - from, progressEmitter(jobId));

    const segments: DetectedSegment[] = [];
    assert(process.stdout != null);
    const rl = readline.createInterface({ input: process.stdout });
    let lastTime: number | undefined;

    rl.on('line', (line) => {
        const match = line.match(/^frame:\d+\s+pts:\d+\s+pts_time:([\d.]+)/);
        if (!match) {
            return;
        }
        const time = parseFloat(match[1]!);
        if (!Number.isNaN(time)) {
            if (lastTime != null && time > lastTime) {
                const segment = { start: from + lastTime, end: from + time };
                segments.push(segment);
                emitToRenderer('ffSegmentDetected', jobId, segment);
            }
            lastTime = time;
        }
    });

    await process;
    return { segments, command: getFfCommandLine('ffmpeg', args) };
}

async function detectIntervals({ jobId, filePath, customArgs, from, to, matchLineTokens, boundingMode, ffmpegHwaccel }: {
    jobId: string;
    filePath: string;
    customArgs: string[];
    from: number;
    to: number;
    matchLineTokens: (line: string) => DetectedSegment | undefined;
    boundingMode: boolean;
    ffmpegHwaccel: FfmpegHwAccel;
}) {
    const args = [
        '-hide_banner',
        ...getHwaccelArgs(ffmpegHwaccel),
        ...getInputSeekArgs({ filePath, from, to }),
        ...customArgs,
        '-f', 'null', '-',
    ];
    const process = runFfmpegProcess(args, { buffer: false }, { jobId });

    const segments: DetectedSegment[] = [];
    const onSegmentDetected = (segment: DetectedSegment) => {
        segments.push(segment);
        emitToRenderer('ffSegmentDetected', jobId, segment);
    };

    let lastMidpoint: number | undefined;

    function customMatcher(line: string) {
        const match = matchLineTokens(line);
        if (match == null) {
            return;
        }
        const { start, end } = match;

        if (boundingMode) {
            onSegmentDetected({ start: from + start, end: from + end });
        } else {
            const midpoint = start + ((end - start) / 2);
            onSegmentDetected({ start: from + (lastMidpoint ?? 0), end: from + midpoint });
            lastMidpoint = midpoint;
        }
    }

    handleProgress(process, to - from, progressEmitter(jobId), customMatcher);

    await process;

    if (!boundingMode && lastMidpoint != null) {
        onSegmentDetected({ start: from + lastMidpoint, end: to });
    }

    return { segments, command: getFfCommandLine('ffmpeg', args) };
}

const mapFilterOptions = (options: Record<string, string>) => Object.entries(options).map(([key, value]) => `${key}=${value}`).join(':');

export async function blackDetect({ streamId, filterOptions, ...rest }: DetectOptions & { filterOptions: Record<string, string>; boundingMode: boolean; }) {
    return detectIntervals({
        ...rest,
        matchLineTokens: (line) => {
            const match = line.match(/^[blackdetect\s*@\s*0x[0-9a-f]+] black_start:([\d\\.]+) black_end:([\d\\.]+) black_duration:[\d\\.]+/);
            if (!match) {
                return undefined;
            }
            const start = parseFloat(match[1]!);
            const end = parseFloat(match[2]!);
            if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || end <= 0 || start >= end) {
                return undefined;
            }
            return { start, end };
        },
        customArgs: [
            '-map', streamId != null ? `0:${streamId}` : 'v:0',
            '-filter:v', `blackdetect=${mapFilterOptions(filterOptions)}`,
        ],
    });
}

export async function silenceDetect({ streamId, filterOptions, ...rest }: DetectOptions & { filterOptions: Record<string, string>; boundingMode: boolean; }) {
    return detectIntervals({
        ...rest,
        matchLineTokens: (line) => {
            const match = line.match(/^[silencedetect\s*@\s*0x[0-9a-f]+] silence_end: ([\d\\.]+)[|\s]+silence_duration: ([\d\\.]+)/);
            if (!match) {
                return undefined;
            }
            const end = parseFloat(match[1]!);
            const silenceDuration = parseFloat(match[2]!);
            if (Number.isNaN(end) || Number.isNaN(silenceDuration)) {
                return undefined;
            }
            const start = end - silenceDuration;
            if (start < 0 || end <= 0 || start >= end) {
                return undefined;
            }
            return { start, end };
        },
        customArgs: [
            '-map', streamId != null ? `0:${streamId}` : 'a:0',
            '-filter:a', `silencedetect=${mapFilterOptions(filterOptions)}`,
        ],
    });
}

function getQualityOpts({ captureFormat, quality }: { captureFormat: CaptureFormat; quality: number; }) {
    if (captureFormat === 'jpeg') {
        return ['-q:v', String(getFfmpegJpegQuality(quality))];
    }
    if (captureFormat === 'webp') {
        return ['-q:v', String(Math.max(0, Math.min(100, Math.round(quality * 100))))];
    }
    return [];
}

function getCodecOpts(captureFormat: CaptureFormat) {
    // else we get only a single file for webp https://github.com/mifi/lossless-cut/issues/1693
    return captureFormat === 'webp' ? ['-c:v', 'libwebp'] : [];
}

export async function captureFrames({ jobId, from, to, videoPath, outPathTemplate, quality, filter, framePts, captureFormat }: {
    jobId?: string;
    from: number;
    to?: number | undefined;
    videoPath: string;
    outPathTemplate: string;
    quality: number;
    filter?: string | undefined;
    framePts?: boolean | undefined;
    captureFormat: CaptureFormat;
}) {
    const args = [
        '-ss', String(from),
        '-i', videoPath,
        ...(to != null ? ['-t', String(Math.max(0, to - from))] : []),
        ...getQualityOpts({ captureFormat, quality }),
        ...(to == null
            ? ['-frames:v', '1'] // for markers, just capture 1 frame
            : (filter != null ? [
                '-vf', filter,
                // https://superuser.com/questions/1336285/use-ffmpeg-for-thumbnail-selections
                ...(framePts ? ['-frame_pts', '1'] : []),
                '-vsync', '0', // else we get a ton of duplicates (thumbnail filter)
            ] : [])
        ),
        ...getCodecOpts(captureFormat),
        '-f', 'image2',
        '-y', outPathTemplate,
    ];

    const process = runFfmpegProcess(args, { buffer: false }, { jobId });
    const emit = progressEmitter(jobId);
    if (to != null) {
        handleProgress(process, to - from, emit);
    }
    await process;
    emit(1);
    return args;
}

function getCaptureFrameArgs({ timestamp, videoPath, quality }: { timestamp: number; videoPath: string; quality: number; }) {
    return [
        '-ss', String(timestamp),
        '-i', videoPath,
        '-frames:v', '1',
        '-q:v', String(getFfmpegJpegQuality(quality)),
    ];
}

export async function captureFrameToBuffer({ timestamp, videoPath, quality, width }: { timestamp: number; videoPath: string; quality: number; width?: number; }) {
    const args = [
        ...getCaptureFrameArgs({ timestamp, videoPath, quality }),
        ...(width != null ? ['-vf', `scale=${width}:-2`] : []),
        '-c:v', 'mjpeg',
        '-f', 'image2',
        '-',
    ];
    const { stdout } = await runFfmpegProcess(args, {}, { logCli: false });
    return new Uint8Array(stdout);
}

export async function captureFrameToClipboard(params: { timestamp: number; videoPath: string; quality: number; }) {
    await writeClipboardImage(await captureFrameToBuffer(params));
}

export async function captureFrameToFile({ timestamp, videoPath, outPath, quality }: { timestamp: number; videoPath: string; outPath: string; quality: number; }) {
    const args = [
        ...getCaptureFrameArgs({ timestamp, videoPath, quality }),
        '-y', outPath,
    ];
    await runFfmpegProcess(args);
    return args;
}

export async function downloadMediaUrl(url: string, outPath: string) {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
    const args = [
        '-hide_banner', '-loglevel', 'error',
        '-user_agent', userAgent,
        '-i', url,
        '-c', 'copy',
        outPath,
    ];
    await runFfmpegProcess(args);
}

/** Transcodes to fragmented mp4 on stdout, for formats the <video> element can't play */
export function createMediaSourceProcess({ path, videoStreamIndex, audioStreams, seekTo, size, fps, rotate, forceColorspace, ffmpegHwaccel }: CompatStreamParams & { forceColorspace?: boolean | undefined; }) {
    function getFilters() {
        const graph: string[] = [];

        if (videoStreamIndex != null) {
            // reduce the color space to bt709 for compatibility, especially because of https://github.com/electron/electron/issues/47947
            const scaleFilterOptions: string[] = [];
            if (size != null) {
                scaleFilterOptions.push(`${size}:${size}:flags=lanczos:force_original_aspect_ratio=decrease:force_divisible_by=2`);
            }
            scaleFilterOptions.push('in_color_matrix=auto:in_range=auto:out_color_matrix=bt709:out_range=tv');

            const videoFilters = [
                ...(fps != null ? [`fps=${fps}`] : []),
                // some PRORES 10 bit files have invalid color space info and the scale filter fails without this
                ...(forceColorspace ? ['colorspace=iall=bt709:all=bt709'] : []),
                `scale=${scaleFilterOptions.join(':')}`,
                'setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709',
                'format=yuv420p',
            ];
            graph.push(`[0:${videoStreamIndex}]${videoFilters.join(',')}[video]`);
        }

        if (audioStreams.length > 0) {
            // some streams have a channel layout that ffmpeg cannot resample or downmix, so relabel it first
            const getAudioFilters = (stream: typeof audioStreams[number], rest: string[]) => {
                const filters = [getFixChannelLayoutFilter(stream), ...rest].filter((f) => f != null);
                return filters.length > 0 ? filters.join(',') : 'anull';
            };

            if (audioStreams.length > 1) {
                const resampledStr = audioStreams.map(({ index }) => `[resampled${index}]`).join('');
                const weightsStr = audioStreams.map(() => '1').join(' ');
                graph.push(
                    ...audioStreams.map((stream) => `[0:${stream.index}]${getAudioFilters(stream, ['aresample=44100'])}[resampled${stream.index}]`),
                    `${resampledStr}amix=inputs=${audioStreams.length}:duration=longest:weights=${weightsStr}:normalize=0:dropout_transition=2[audio]`,
                );
            } else {
                graph.push(`[0:${audioStreams[0]!.index}]${getAudioFilters(audioStreams[0]!, [])}[audio]`);
            }
        }

        return graph.length === 0 ? [] : ['-filter_complex', graph.join(';')];
    }

    const args = [
        '-hide_banner',
        '-loglevel', 'error',
        ...getHwaccelArgs(ffmpegHwaccel),
        '-fflags', '+nobuffer+flush_packets+discardcorrupt',
        '-avioflags', 'direct',
        '-flush_packets', '1',
        '-ss', String(seekTo),
        ...(rotate != null ? ['-display_rotation', '0', '-noautorotate'] : []),
        '-i', path,
        '-fps_mode', 'passthrough',
        '-map_metadata', '-1',
        '-map_chapters', '-1',
        ...getFilters(),
        ...(videoStreamIndex != null ? [
            '-map', '[video]',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-crf', '10',
            '-g', '1', // reduces latency and buffering
        ] : ['-vn']),
        ...(audioStreams.length > 0 ? [
            '-map', '[audio]',
            '-ac', '2', '-c:a', 'aac', '-b:a', '128k',
        ] : ['-an']),
        '-f', 'mp4', '-movflags', '+frag_keyframe+empty_moov+default_base_moof', '-',
    ];

    logger.info(getFfCommandLine('ffmpeg', args));

    return execa(getFfPath('ffmpeg'), args, { env: getEnv(), buffer: { stdout: false, stderr: true }, encoding: 'utf8' });
}
