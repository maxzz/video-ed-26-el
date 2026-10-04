import type { FfCommand } from './ipc-contract.ts';

function escapeCliArg(arg: string, isWindows: boolean) {
    if (isWindows) {
        // https://github.com/mifi/lossless-cut/issues/2151
        return /[\s"&<>^|]/.test(arg) ? `"${arg.replaceAll('"', '""')}"` : arg;
    }
    return /[^\w-]/.test(arg) ? `'${arg.replaceAll("'", '\'"\'"\'')}'` : arg;
}

export function getFfCommandLine(cmd: FfCommand, args: readonly string[], isWindows: boolean) {
    return `${cmd} ${args.map((arg) => escapeCliArg(String(arg), isWindows)).join(' ')}`;
}
