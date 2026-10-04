import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { getFilesFromArgs, parseCliArgs, parseLossyMode } from './cli.ts';

// process.defaultApp is undefined under vitest, so only the executable is skipped
const parse = (...args: string[]) => parseCliArgs(['VideoEd.exe', ...args]);

describe('parseCliArgs', () => {
    it('parses options', () => {
        const argv = parse('--disable-networking', '--settings-json', '{ captureFormat: "png" }', '--config-dir', 'cfg', '--locales-path', 'loc', '--http-api', '1234');
        expect(argv['disableNetworking']).toBe(true);
        expect(argv['settingsJson']).toBe('{ captureFormat: "png" }');
        expect(argv['configDir']).toBe('cfg');
        expect(argv['localesPath']).toBe('loc');
        expect(argv['httpApi']).toBe(1234);
    });

    it('parses --http-api without a port', () => {
        expect(parse('--http-api')['httpApi']).toBe(true);
    });

    it('keeps --keyboard-action as a string and positional args as JSON', () => {
        const argv = parse('--keyboard-action', 'export', '{"a":1}');
        expect(argv['keyboardAction']).toBe('export');
        expect(argv._.map((arg) => JSON.parse(String(arg)))).toEqual([{ a: 1 }]);
    });
});

describe('getFilesFromArgs', () => {
    it('resolves relative paths against cwd and skips switches', () => {
        const cwd = path.resolve('/work');
        const absolute = path.resolve('/videos/b.mp4');
        expect(getFilesFromArgs(parse('a.mp4', absolute, '.'), cwd)).toEqual([path.join(cwd, 'a.mp4'), absolute]);
    });
});

describe('parseLossyMode', () => {
    it('parses and validates', () => {
        expect(parseLossyMode('{ videoEncoder: "libx264" }')).toEqual({ videoEncoder: 'libx264' });
        expect(parseLossyMode(undefined)).toBeUndefined();
        expect(() => parseLossyMode('{ videoEncoder: "nope" }')).toThrow();
    });
});
