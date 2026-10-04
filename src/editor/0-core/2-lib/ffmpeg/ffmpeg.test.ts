import { describe, expect, it } from 'vitest';

import type { FFprobeFormat, FFprobeStream } from '@shared/ffprobe.ts';
import { findNearestKeyFrameTime, getExperimentalArgs, getSafeCutTime, getStreamFps, getTimecodeFromStreams, getVideoTimescaleArgs, isCuttingEnd, isCuttingStart, isIphoneHevc, isProblematicAvc1, mapRecommendedDefaultFormat, tryMapChaptersToEdl, type Frame } from './ffmpeg.ts';

const createdAt = new Date(0);
const frame = (time: number, keyframe = false): Frame => ({ time, keyframe, createdAt });
const stream = (props: Partial<FFprobeStream>) => props as FFprobeStream;

describe('isCuttingStart / isCuttingEnd', () => {
    it('detects cuts', () => {
        expect(isCuttingStart(0)).toBe(false);
        expect(isCuttingStart(0.1)).toBe(true);
        expect(isCuttingEnd(10, 10)).toBe(false);
        expect(isCuttingEnd(9, 10)).toBe(true);
        expect(isCuttingEnd(9, undefined)).toBe(true);
        expect(isCuttingEnd(9, 0)).toBe(true);
    });
});

describe('getSafeCutTime', () => {
    const frames = [frame(0, true), frame(1), frame(2), frame(3, true), frame(4), frame(5), frame(6, true), frame(7)];

    it('next mode moves to the next keyframe', () => {
        expect(getSafeCutTime(frames, 1.5, true)).toBe(3);
        expect(getSafeCutTime(frames, 3, true)).toBeUndefined();
    });

    it('prev mode moves to the frame before the previous keyframe', () => {
        expect(getSafeCutTime(frames, 2, false)).toBeUndefined();
        expect(getSafeCutTime(frames, 4.5, false)).toBe(2);
        expect(getSafeCutTime(frames, 7, false)).toBeUndefined();
    });

    it('throws for too few frames', () => {
        expect(() => getSafeCutTime([frame(0, true)], 0, true)).toThrow();
    });
});

describe('findNearestKeyFrameTime', () => {
    const frames = [frame(0, true), frame(1), frame(2, true), frame(3), frame(4, true)];
    it('finds in both directions', () => {
        expect(findNearestKeyFrameTime({ frames, time: 2.5, direction: 1 })).toBe(4);
        expect(findNearestKeyFrameTime({ frames, time: 2.5, direction: -1 })).toBe(2);
        expect(findNearestKeyFrameTime({ frames, time: 4.5, direction: 1 })).toBeUndefined();
    });
});

describe('tryMapChaptersToEdl', () => {
    it('maps chapters and skips invalid ones', () => {
        expect(tryMapChaptersToEdl([
            { id: 0, time_base: '1/1000', start: 0, end: 1000, start_time: '0.000000', end_time: '1.000000', tags: { title: 'Intro' } },
            { id: 1, time_base: '1/1000', start: 1000, end: 2000, start_time: '1.000000', end_time: '2.000000' },
            { id: 2, time_base: '1/1000', start: 0, end: 0, start_time: 'N/A', end_time: 'N/A' },
        ] as never)).toEqual([
            { start: 0, end: 1, name: 'Intro' },
            { start: 1, end: 2, name: undefined },
        ]);
    });
});

describe('mapRecommendedDefaultFormat', () => {
    it('recommends mov for pcm audio in mp4', () => {
        expect(mapRecommendedDefaultFormat({ sourceFormat: 'mp4', streams: [stream({ codec_name: 'pcm_s16le' })] }).format).toBe('mov');
        expect(mapRecommendedDefaultFormat({ sourceFormat: 'mp4', streams: [stream({ codec_name: 'aac' })] })).toEqual({ format: 'mp4' });
        expect(mapRecommendedDefaultFormat({ sourceFormat: 'matroska', streams: [stream({ codec_name: 'pcm_s16le' })] })).toEqual({ format: 'matroska' });
    });
});

describe('isIphoneHevc / isProblematicAvc1', () => {
    it('detects iPhone hevc', () => {
        const format = { tags: { 'com.apple.quicktime.make': 'Apple', 'com.apple.quicktime.model': 'iPhone 15' } } as unknown as FFprobeFormat;
        expect(isIphoneHevc(format, [stream({ codec_name: 'hevc' })])).toBe(true);
        expect(isIphoneHevc(format, [stream({ codec_name: 'h264' })])).toBe(false);
    });

    it('detects problematic avc1', () => {
        const s = stream({ codec_name: 'h264', codec_tag: '0x31637661', codec_tag_string: 'avc1', pix_fmt: 'yuv422p10le' });
        expect(isProblematicAvc1('mov', [s])).toBe(true);
        expect(isProblematicAvc1('matroska', [s])).toBe(false);
    });
});

describe('getStreamFps', () => {
    it('reads video and audio frame rates', () => {
        expect(getStreamFps(stream({ codec_type: 'video', avg_frame_rate: '30000/1001' }))).toBeCloseTo(29.97, 2);
        expect(getStreamFps(stream({ codec_type: 'video', avg_frame_rate: '0/0' }))).toBeUndefined();
        expect(getStreamFps(stream({ codec_type: 'audio', codec_name: 'aac', sample_rate: '48000' }))).toBe(48000 / 1024);
        expect(getStreamFps(stream({ codec_type: 'audio', codec_name: 'mp3', sample_rate: '44100' }))).toBe(44100 / 1152);
        expect(getStreamFps(stream({ codec_type: 'audio', codec_name: 'opus', sample_rate: '48000' }))).toBeUndefined();
    });
});

describe('getTimecodeFromStreams', () => {
    it('parses the first timecode tag', () => {
        expect(getTimecodeFromStreams([
            stream({ index: 0, codec_type: 'audio' }),
            stream({ index: 1, codec_type: 'video', avg_frame_rate: '25/1', tags: { timecode: '01:00:00:12' } }),
        ])).toBe(3600 + 12 / 25);
        expect(getTimecodeFromStreams([stream({ index: 0 })])).toBeUndefined();
    });
});

it('builds misc args', () => {
    expect(getExperimentalArgs(true)).toEqual(['-strict', 'experimental']);
    expect(getExperimentalArgs(false)).toEqual([]);
    expect(getVideoTimescaleArgs(90000)).toEqual(['-video_track_timescale', '90000']);
    expect(getVideoTimescaleArgs(undefined)).toEqual([]);
});
