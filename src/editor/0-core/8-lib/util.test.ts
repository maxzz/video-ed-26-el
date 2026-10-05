import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { formatKeybinding } from './utils-kbd.ts';
import { calculateTimelinePercent, checkFileSizes, escapeRegExp, filenamify, getExtensionForFormat, getOutDir, getOutFileExtension, getOutPath, getSuffixedOutPath, hasDuplicates, isAbortedError, isExecaError, shuffleArray } from './util.ts';

describe('out paths', () => {
    const dir = path.resolve('/videos');
    const filePath = path.join(dir, 'file.mp4');
    const customOutDir = path.resolve('/out');

    it('getOutDir prefers the custom dir', () => {
        expect(getOutDir(customOutDir, filePath)).toBe(customOutDir);
        expect(getOutDir(undefined, filePath)).toBe(dir);
        expect(getOutDir(undefined, undefined)).toBeUndefined();
    });

    it('getOutPath / getSuffixedOutPath', () => {
        expect(getOutPath({ filePath, fileName: 'x.mp4' })).toBe(path.join(dir, 'x.mp4'));
        expect(getOutPath({ customOutDir, filePath, fileName: 'x.mp4' })).toBe(path.join(customOutDir, 'x.mp4'));
        expect(getOutPath({ fileName: 'x.mp4' })).toBeUndefined();
        expect(getSuffixedOutPath({ filePath, nameSuffix: 'cut.mkv' })).toBe(path.join(dir, 'file-cut.mkv'));
    });
});

it('filenamify', () => {
    expect(filenamify('a/b\\c:d*e?f"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j');
    expect(filenamify('Ünïcödé 名前 file-name_1.2')).toBe('Ünïcödé 名前 file-name_1.2');
});

describe('extensions', () => {
    it('getExtensionForFormat', () => {
        expect(getExtensionForFormat('matroska')).toBe('mkv');
        expect(getExtensionForFormat('ipod')).toBe('m4a');
        expect(getExtensionForFormat('adts')).toBe('aac');
        expect(getExtensionForFormat('mpegts')).toBe('ts');
        expect(getExtensionForFormat('mp4')).toBe('mp4');
    });

    it('getOutFileExtension', () => {
        expect(getOutFileExtension({ outFormat: 'mp4', filePath: 'a.MP4' })).toBe('.MP4');
        expect(getOutFileExtension({ outFormat: 'mov', filePath: 'a.mp4' })).toBe('.mov');
        expect(getOutFileExtension({ outFormat: 'mov', filePath: 'a.MOV' })).toBe('.MOV');
        expect(getOutFileExtension({ isCustomFormatSelected: true, outFormat: 'matroska', filePath: 'a.mp4' })).toBe('.mkv');
    });
});

it('hasDuplicates', () => {
    expect(hasDuplicates([1, 2, 3])).toBe(false);
    expect(hasDuplicates(['a', 'b', 'a'])).toBe(true);
});

it('escapeRegExp', () => {
    expect(new RegExp(escapeRegExp('a.b*c(d)')).test('a.b*c(d)')).toBe(true);
    expect(new RegExp(escapeRegExp('a.b')).test('axb')).toBe(false);
});

it('shuffleArray keeps all elements', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = shuffleArray(input);
    expect(shuffled).not.toBe(input);
    expect([...shuffled].sort()).toEqual(input);
});

it('checkFileSizes', () => {
    expect(checkFileSizes(1000, 1040)).toBeUndefined();
    expect(checkFileSizes(1000, 2000)).toBeDefined();
});

it('isExecaError / isAbortedError', () => {
    const err = Object.assign(new Error('x'), { failed: true, shortMessage: 'x', isForcefullyTerminated: false, stderr: '', isCanceled: true });
    expect(isExecaError(err)).toBe(true);
    expect(isExecaError(new Error('x'))).toBe(false);
    expect(isAbortedError(err)).toBe(true);
    expect(isAbortedError(Object.assign(new Error('x'), { name: 'AbortError' }))).toBe(true);
    expect(isAbortedError(new Error('x'))).toBe(false);
});

it('formatKeybinding', () => {
    const layout = new Map([['KeyA', 'q']]);
    expect(formatKeybinding('ControlLeft+KeyA', layout)).toBe('Ctrl+q');
    expect(formatKeybinding('ShiftLeft+ArrowLeft', layout)).toBe('Shift+←');
    expect(formatKeybinding('KeyA', undefined)).toBeUndefined();
});

it('calculateTimelinePercent', () => {
    expect(calculateTimelinePercent(5, 10)).toBe('50%');
    expect(calculateTimelinePercent(20, 10)).toBe('100%');
    expect(calculateTimelinePercent(undefined, 10)).toBeUndefined();
});
