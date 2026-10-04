// Downloads ffmpeg + ffprobe builds (the same ones LosslessCut ships) into resources/ffmpeg/<platform>-<arch>.
// usage: node scripts/fetch-ffmpeg.mjs [platform-arch]   e.g. win32-x64, darwin-arm64, linux-x64
import { execFileSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const version = '8.0-1';
const target = process.argv[2] ?? `${process.platform}-${process.arch}`;
const outDir = join(import.meta.dirname, '..', 'resources', 'ffmpeg', target);

const sources = {
    'darwin-x64': { type: 'bin', ffmpeg: `https://github.com/mifi/ffmpeg-build-script/releases/download/${version}/ffmpeg-macos-X64`, ffprobe: `https://github.com/mifi/ffmpeg-build-script/releases/download/${version}/ffprobe-macos-X64` },
    'darwin-arm64': { type: 'bin', ffmpeg: `https://github.com/mifi/ffmpeg-build-script/releases/download/${version}/ffmpeg-macos-ARM64`, ffprobe: `https://github.com/mifi/ffmpeg-build-script/releases/download/${version}/ffprobe-macos-ARM64` },
    'linux-x64': { type: 'archive', url: `https://github.com/mifi/ffmpeg-builds/releases/download/${version}/ffmpeg-n8.0-latest-linux64-gpl-shared-8.0.tar.xz`, file: 'ffmpeg.tar.xz' },
    'win32-x64': { type: 'archive', url: `https://github.com/mifi/ffmpeg-builds/releases/download/${version}/ffmpeg-n8.0-latest-win64-gpl-shared-8.0.zip`, file: 'ffmpeg.zip' },
    'win32-arm64': { type: 'archive', url: `https://github.com/mifi/ffmpeg-builds/releases/download/${version}/ffmpeg-n8.0.1-76-gfa4ee7ab3c-winarm64-gpl-shared-8.0.zip`, file: 'ffmpeg.zip' },
};

async function download(url, dest) {
    console.log('Downloading', url);
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
        throw new Error(`Download failed: ${res.status} ${url}`);
    }
    writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

function findDir(root, name) {
    for (const entry of readdirSync(root)) {
        const p = join(root, entry);
        if (statSync(p).isDirectory()) {
            if (entry === name) {
                return p;
            }
            const found = findDir(p, name);
            if (found) {
                return found;
            }
        }
    }
    return undefined;
}

async function main() {
    const source = sources[target];
    if (!source) {
        throw new Error(`Unsupported target ${target}. Supported: ${Object.keys(sources).join(', ')}`);
    }
    mkdirSync(outDir, { recursive: true });

    if (source.type === 'bin') {
        for (const cmd of ['ffmpeg', 'ffprobe']) {
            const dest = join(outDir, cmd);
            await download(source[cmd], dest);
            chmodSync(dest, 0o755);
        }
    } else {
        const tmp = join(outDir, '.tmp');
        rmSync(tmp, { recursive: true, force: true });
        mkdirSync(tmp, { recursive: true });
        const archive = join(tmp, source.file);
        await download(source.url, archive);
        // bsdtar ships with Windows 10+ and extracts zip as well as tar.xz
        execFileSync('tar', ['-xf', archive, '-C', tmp], { stdio: 'inherit' });

        const binDir = findDir(tmp, 'bin');
        const libDir = target.startsWith('linux') ? findDir(tmp, 'lib') : undefined;
        if (!binDir) {
            throw new Error('bin folder not found in archive');
        }
        for (const entry of readdirSync(binDir)) {
            if (/^(ffmpeg|ffprobe)(\.exe)?$/.test(entry) || entry.endsWith('.dll')) {
                cpSync(join(binDir, entry), join(outDir, entry));
            }
        }
        if (libDir) {
            for (const entry of readdirSync(libDir)) {
                if (/\.so(\.|$)/.test(entry)) {
                    cpSync(join(libDir, entry), join(outDir, entry), { dereference: true });
                }
            }
        }
        rmSync(tmp, { recursive: true, force: true });
    }

    const exe = process.platform === 'win32' && target.startsWith('win32') ? 'ffmpeg.exe' : 'ffmpeg';
    if (!existsSync(join(outDir, exe))) {
        throw new Error('ffmpeg missing after extraction');
    }
    console.log('ffmpeg ready in', outDir);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
