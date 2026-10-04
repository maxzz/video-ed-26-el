import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FFprobeStream } from '@shared/ffprobe.ts';
import { mainApi } from '../main-api.ts';
import { resetMainApiMocks } from '@/editor/f-platform/test/main-api-mock.ts';
import { getCodecParams, needsSmartCut } from './smartcut.ts';

function mockPackets(packets: { pts_time: string, flags: string }[]) {
    vi.mocked(mainApi.ffRun).mockResolvedValue({ stdout: JSON.stringify({ packets }), stderr: '', exitCode: 0, command: '' });
}

beforeEach(() => resetMainApiMocks());

describe('needsSmartCut', () => {
    it('does not need smart cut on an exact keyframe', async () => {
        mockPackets([{ pts_time: '0.000000', flags: 'K__' }, { pts_time: '2.000000', flags: 'K__' }, { pts_time: '2.500000', flags: '___' }]);
        expect(await needsSmartCut({ path: 'a.mp4', desiredCutFrom: 2, videoStream: { index: 0 } })).toEqual({ losslessCutFrom: 2, segmentNeedsSmartCut: false });
    });

    it('cuts losslessly from the next keyframe', async () => {
        mockPackets([{ pts_time: '0.000000', flags: 'K__' }, { pts_time: '1.000000', flags: '___' }, { pts_time: '4.000000', flags: 'K__' }]);
        expect(await needsSmartCut({ path: 'a.mp4', desiredCutFrom: 1, videoStream: { index: 0 } })).toEqual({ losslessCutFrom: 4, segmentNeedsSmartCut: true });
        expect(mainApi.ffRun).toHaveBeenCalledWith('ffprobe', expect.arrayContaining(['-read_intervals', '0%6', '-select_streams', '0', 'a.mp4']), { logCli: false });
    });

    it('throws when no keyframe follows', async () => {
        mockPackets([{ pts_time: '0.000000', flags: 'K__' }]);
        await expect(needsSmartCut({ path: 'a.mp4', desiredCutFrom: 1, videoStream: { index: 0 } })).rejects.toThrow();
        expect(mainApi.ffRun).toHaveBeenCalledTimes(2);
    });
});

describe('getCodecParams', () => {
    const videoStream = { index: 0, codec_type: 'video', codec_name: 'av1', bit_rate: '1000000', time_base: '1/90000', disposition: { attached_pic: 0 } } as unknown as FFprobeStream;

    it('maps codec, bitrate and timebase', async () => {
        expect(await getCodecParams({ path: 'a.mp4', fileDuration: 10, streams: [videoStream] })).toEqual({
            videoStream,
            videoCodec: 'libsvtav1',
            videoBitrate: 1200000,
            videoTimebase: 90000,
        });
    });

    it('estimates bitrate from file size', async () => {
        vi.mocked(mainApi.stat).mockResolvedValue({ size: 1e6, atimeMs: 0, mtimeMs: 0, ctimeMs: 0, birthtimeMs: 0, isFile: true, isDirectory: false });
        const { videoBitrate } = await getCodecParams({ path: 'a.mp4', fileDuration: 8, streams: [{ ...videoStream, bit_rate: undefined }] });
        expect(videoBitrate).toBe(1200000);
    });

    it('requires exactly one video stream', async () => {
        await expect(getCodecParams({ path: 'a.mp4', fileDuration: 10, streams: [] })).rejects.toThrow();
        await expect(getCodecParams({ path: 'a.mp4', fileDuration: 10, streams: [videoStream, { ...videoStream, index: 1 }] })).rejects.toThrow();
    });
});
