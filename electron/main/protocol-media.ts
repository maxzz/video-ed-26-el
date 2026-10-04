import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { protocol } from 'electron';
import mime from 'mime-types';
import { COMPAT_PROTOCOL, MEDIA_PROTOCOL, type CompatStreamParams } from '@shared/ipc-contract.ts';
import logger from './logger.ts';
import { createMediaSourceProcess } from './ffmpeg/ffmpeg.ts';

/** Must be called before app 'ready' */
export function registerMediaSchemes() {
    protocol.registerSchemesAsPrivileged([
        { scheme: MEDIA_PROTOCOL, privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true, corsEnabled: true } },
        { scheme: COMPAT_PROTOCOL, privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true, corsEnabled: true } },
    ]);
}

function parseRange(rangeHeader: string, size: number) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!match) {
        return undefined;
    }
    let start = match[1] ? parseInt(match[1], 10) : undefined;
    let end = match[2] ? parseInt(match[2], 10) : undefined;
    if (start == null && end != null) { // suffix range: last N bytes
        start = Math.max(0, size - end);
        end = size - 1;
    }
    start ??= 0;
    end = Math.min(end ?? size - 1, size - 1);
    if (start > end || start >= size) {
        return undefined;
    }
    return { start, end };
}

async function handleMediaRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.pathname.slice(1));

    let size: number;
    try {
        size = (await stat(filePath)).size;
    } catch {
        return new Response('Not found', { status: 404 });
    }

    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    const rangeHeader = request.headers.get('range');
    const range = rangeHeader ? parseRange(rangeHeader, size) : undefined;

    if (rangeHeader && !range) {
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }

    const { start, end } = range ?? { start: 0, end: size - 1 };
    const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream;

    return new Response(stream, {
        status: range ? 206 : 200,
        headers: {
            'Content-Type': contentType,
            'Content-Length': String(end - start + 1),
            'Accept-Ranges': 'bytes',
            ...(range && { 'Content-Range': `bytes ${start}-${end}/${size}` }),
        },
    });
}

// compat player streams: id -> params, consumed once by the renderer's fetch()
const compatStreams = new Map<string, { params: CompatStreamParams; forceColorspace?: boolean; abort?: () => void; }>();

export function createCompatStream(params: CompatStreamParams) {
    const id = randomUUID();
    compatStreams.set(id, { params });
    return `${COMPAT_PROTOCOL}://stream/${id}`;
}

export function abortCompatStream(url: string) {
    const id = new URL(url).pathname.slice(1);
    compatStreams.get(id)?.abort?.();
    compatStreams.delete(id);
}

async function handleCompatRequest(request: Request): Promise<Response> {
    const id = new URL(request.url).pathname.slice(1);
    const entry = compatStreams.get(id);
    if (!entry) {
        return new Response('Not found', { status: 404 });
    }

    const process = createMediaSourceProcess({ ...entry.params, forceColorspace: entry.forceColorspace });
    entry.abort = () => process.kill('SIGKILL');

    process.catch((err: unknown) => {
        const stderr = (err as { stderr?: string; }).stderr ?? '';
        if (/^\[swscaler[^\]]+\]\s+Unsupported input/m.test(stderr)) {
            // the renderer restarts the stream on error; force colorspace conversion next time
            logger.warn('Compat stream: unsupported colorspace input');
            entry.forceColorspace = true;
        } else {
            logger.warn('Compat stream process ended', err instanceof Error ? err.message : err);
        }
    });

    request.signal?.addEventListener('abort', () => process.kill('SIGKILL'));

    const body = Readable.toWeb(process.stdout) as ReadableStream;
    return new Response(body, { status: 200, headers: { 'Content-Type': 'video/mp4' } });
}

export function handleMediaProtocols() {
    protocol.handle(MEDIA_PROTOCOL, handleMediaRequest);
    protocol.handle(COMPAT_PROTOCOL, handleCompatRequest);
}
