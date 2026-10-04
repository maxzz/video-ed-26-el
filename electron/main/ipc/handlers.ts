import { access, constants, lstat, mkdir, readdir, readFile, rename, stat, unlink, utimes, writeFile } from 'node:fs/promises';
import type { Stats } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import assert from 'node:assert';
import { app, clipboard, dialog, ipcMain, Notification, shell } from 'electron';
import mime from 'mime-types';
import cueParser from 'cue-parser';
import { IPC_INVOKE_CHANNEL, type FileStat, type MainApi } from '@shared/ipc-contract.ts';
import { appName } from '@shared/constants.ts';
import * as configStore from '../config-store.ts';
import * as ffmpeg from '../ffmpeg/ffmpeg.ts';
import { checkFfExists, getFfPath, setCustomFfPath } from '../ffmpeg/paths.ts';
import { abortCompatStream, createCompatStream } from '../protocol-media.ts';
import { appState } from '../app-state.ts';
import { emitAppEvent, resolveApiAction } from '../api-actions.ts';
import { changeLanguage } from '../i18n.ts';
import { installSystemMenu } from '../menu.ts';
import { performHostAction as runHostMenuAction } from '../menu-actions/index.ts';
import { openExternalUrl, showItemInFolder as revealInFolder } from '../shell.ts';
import { quitApp as quit, toggleDevToolsWindow, toggleFullscreenWindow } from '../window.ts';
import { emitToRenderer } from '../events.ts';
import logger, { logFilePath } from '../logger.ts';
import { arch, isDev, isLinux, isMac, isWindows, pathExists, platform, writeClipboardImage } from '../util.ts';

function toFileStat(s: Stats): FileStat {
    return {
        size: s.size,
        atimeMs: s.atimeMs,
        mtimeMs: s.mtimeMs,
        ctimeMs: s.ctimeMs,
        birthtimeMs: s.birthtimeMs,
        isFile: s.isFile(),
        isDirectory: s.isDirectory(),
    };
}

const exists = async (name: 'ffmpeg' | 'ffprobe') => checkFfExists(name).then(() => true, () => false);

function getWindow() {
    assert(appState.mainWindow, 'No main window');
    return appState.mainWindow;
}

export const handlers: MainApi = {
    // app
    async getAppInfo() {
        return {
            appName,
            version: app.getVersion(),
            platform,
            arch,
            isDev,
            isPackaged: app.isPackaged,
            isWindows,
            isMac,
            isLinux,
            paths: {
                userData: app.getPath('userData'),
                downloads: app.getPath('downloads'),
                documents: app.getPath('documents'),
                desktop: app.getPath('desktop'),
                home: homedir(),
                temp: tmpdir(),
                configFile: configStore.getConfigPath(),
                logFile: logFilePath,
            },
            lossyMode: appState.lossyMode,
            disableNetworking: appState.disableNetworking,
            newVersion: appState.newVersion,
        };
    },
    async rendererReady() {
        appState.rendererReady = true;
        if (appState.filesToOpen.length > 0) {
            emitToRenderer('openFiles', appState.filesToOpen);
            appState.filesToOpen = [];
        }
    },
    async quitApp() {
        quit();
    },
    async focusWindow() {
        try {
            app.focus({ steal: true });
        } catch (err) {
            logger.error('Failed to focus window', err);
        }
    },
    async setProgressBar(progress) {
        appState.mainWindow?.setProgressBar(progress);
    },
    async sendOsNotification({ title, body }) {
        if (!Notification.isSupported()) {
            return;
        }
        const notification = new Notification({ title, ...(body != null && { body }) });
        notification.on('failed', (_e, error) => logger.warn('Notification failed', error));
        notification.show();
    },
    async openExternal(url) {
        await openExternalUrl(url);
    },
    async setAskBeforeClose(value) {
        appState.askBeforeClose = value;
    },
    async setLanguage(language) {
        await changeLanguage(language);
        installSystemMenu();
    },
    async performHostAction(action) {
        await runHostMenuAction(action);
    },
    async apiActionResponse(id) {
        resolveApiAction(id);
    },
    async emitAppEvent(event) {
        emitAppEvent(event);
    },
    async toggleFullscreen() {
        toggleFullscreenWindow();
    },
    async toggleDevTools() {
        toggleDevToolsWindow();
    },

    // config
    async configGetAll() {
        return configStore.getAll();
    },
    async configSet(key, value) {
        configStore.set(key, value);
        if (key === 'customFfPath') {
            setCustomFfPath(value as string | undefined);
        }
    },
    async configReset(key) {
        return configStore.reset(key);
    },

    // dialogs
    async showOpenDialog(options) {
        const { canceled, filePaths } = await dialog.showOpenDialog(getWindow(), options);
        return { canceled, filePaths };
    },
    async showSaveDialog(options) {
        const { canceled, filePath } = await dialog.showSaveDialog(getWindow(), options);
        return { canceled, filePath: filePath || undefined };
    },
    async showMessageBox(options) {
        const { response } = await dialog.showMessageBox(getWindow(), options);
        return { response };
    },

    // fs
    pathExists,
    stat: async (path) => toFileStat(await stat(path)),
    lstat: async (path) => toFileStat(await lstat(path)),
    access: async (path, mode) => access(path, mode === 'write' ? constants.W_OK : mode === 'read' ? constants.R_OK : constants.F_OK),
    readTextFile: async (path) => readFile(path, 'utf8'),
    readBinaryFile: async (path) => new Uint8Array(await readFile(path)),
    parseCueSheet: async (path) => cueParser.parse(path),
    writeTextFile: async (path, text) => writeFile(path, text),
    writeBinaryFile: async (path, data) => writeFile(path, data),
    readdir: async (path, recursive) => readdir(path, { recursive: !!recursive }),
    mkdir: async (path) => { await mkdir(path, { recursive: true }); },
    rename: async (from, to) => rename(from, to),
    unlink: async (path) => unlink(path),
    utimes: async (path, atime, mtime) => utimes(path, atime / 1000, mtime / 1000),
    async trashItem(path) {
        if (!(await pathExists(path))) {
            return;
        }
        await shell.trashItem(path);
    },
    async showItemInFolder(path) {
        revealInFolder(path);
    },
    async getMimeType(path) {
        return mime.lookup(path) || undefined;
    },

    // clipboard
    writeClipboardText: async (text) => clipboard.writeText(text),
    readClipboardText: async () => clipboard.readText(),
    writeClipboardImage: async (data) => writeClipboardImage(data),

    // ffmpeg
    async ffCheckExists() {
        return { ffmpeg: await exists('ffmpeg'), ffprobe: await exists('ffprobe'), ffmpegPath: getFfPath('ffmpeg'), ffprobePath: getFfPath('ffprobe') };
    },
    async ffSetCustomPath(path) {
        setCustomFfPath(path);
    },
    ffRun: async (cmd, args, options) => ffmpeg.run(cmd, args, options),
    ffAbortJob: async (jobId) => ffmpeg.abortJob(jobId),
    ffAbortAll: async () => ffmpeg.abortAll(),
    ffRenderWaveformPng: async (params) => ffmpeg.renderWaveformPng(params),
    ffDetectSceneChanges: async (params) => ffmpeg.detectSceneChanges(params),
    ffBlackDetect: async (params) => ffmpeg.blackDetect(params),
    ffSilenceDetect: async (params) => ffmpeg.silenceDetect(params),
    ffCaptureFrames: async (params) => ffmpeg.captureFrames(params),
    ffCaptureFrameToClipboard: async (params) => ffmpeg.captureFrameToClipboard(params),
    ffCaptureFrameToFile: async (params) => ffmpeg.captureFrameToFile(params),
    ffCaptureFrameToBuffer: async (params) => ffmpeg.captureFrameToBuffer(params),
    async ffDownloadMediaUrl(url, outPath) {
        if (appState.disableNetworking) {
            throw new Error('Networking is disabled');
        }
        await ffmpeg.downloadMediaUrl(url, outPath);
    },
    ffCreateCompatStream: async (params) => createCompatStream(params),
    ffAbortCompatStream: async (url) => abortCompatStream(url),
};

const maxStdioLength = 20000;

function stdioToString(value: unknown) {
    const str = typeof value === 'string' ? value : value instanceof Uint8Array ? new TextDecoder().decode(value) : undefined;
    return str != null && str.length > maxStdioLength ? str.slice(-maxStdioLength) : str;
}

/** Errors thrown in handlers lose their extra props over IPC, so serialize the useful ones (including execa's) into the message */
function serializeError(err: unknown) {
    if (err instanceof Error) {
        const e = err as Error & Record<string, unknown>;
        const extra = {
            name: e.name,
            code: e['code'],
            stderr: stdioToString(e['stderr']),
            exitCode: e['exitCode'],
            failed: e['failed'],
            shortMessage: e['shortMessage'],
            isCanceled: e['isCanceled'],
            isTerminated: e['isTerminated'],
            isForcefullyTerminated: e['isForcefullyTerminated'],
            timedOut: e['timedOut'],
            signal: e['signal'],
            command: e['command'],
        };
        return new Error(JSON.stringify({ message: err.message, ...extra }));
    }
    return err;
}

export function registerIpcHandlers() {
    ipcMain.handle(IPC_INVOKE_CHANNEL, async (_event, method: keyof MainApi, args: unknown[]) => {
        const fn = handlers[method] as ((...a: unknown[]) => Promise<unknown>) | undefined;
        assert(fn, `Unknown API method: ${method}`);
        try {
            return await fn(...args);
        } catch (err) {
            throw serializeError(err);
        }
    });
}
