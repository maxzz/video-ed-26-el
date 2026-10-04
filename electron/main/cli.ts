import { resolve } from 'node:path';
import yargsParser from 'yargs-parser';
import JSON5 from 'json5';
import { z } from 'zod';

// https://github.com/electron/electron/issues/3657
// https://github.com/mifi/lossless-cut/issues/357
export function parseCliArgs(rawArgv = process.argv) {
    // production: first arg is the executable; dev: first 2 args are electron and the entry script
    const ignoreFirstArgs = process.defaultApp ? 2 : 1;
    const argsWithoutAppName = rawArgv.length > ignoreFirstArgs ? rawArgv.slice(ignoreFirstArgs) : [];

    return yargsParser(argsWithoutAppName, {
        boolean: ['disable-networking'],
        string: ['settings-json', 'config-dir', 'lossy-mode', 'locales-path', 'keyboard-action'],
    });
}

export type CliArgs = ReturnType<typeof parseCliArgs>;

const lossyModeSchema = z.object({ videoEncoder: z.union([z.literal('libx264'), z.literal('libx265'), z.literal('libsvtav1')]) });

export function parseLossyMode(value: unknown) {
    return typeof value === 'string' ? lossyModeSchema.parse(JSON5.parse(value)) : undefined;
}

/**
 * Positional args, ignoring Chromium/Electron switches that may sneak in.
 * Relative paths are resolved against `cwd`, which for a second instance is that instance's working directory.
 */
export function getFilesFromArgs(argv: CliArgs, cwd = process.cwd()) {
    return argv._.map(String).filter((arg) => !arg.startsWith('--') && arg !== '.').map((arg) => resolve(cwd, arg));
}
