import type { AudioStreamInfo, CaptureFormat, Config, FfmpegHwAccel, ApiActionRequest } from './types.ts';

export type FfCommand = 'ffmpeg' | 'ffprobe';

export interface AppInfo {
    appName: string;
    version: string;
    platform: string;
    arch: string;
    isDev: boolean;
    isPackaged: boolean;
    isWindows: boolean;
    isMac: boolean;
    isLinux: boolean;
    paths: {
        userData: string;
        downloads: string;
        documents: string;
        desktop: string;
        home: string;
        temp: string;
        configFile: string;
        logFile: string;
    };
    lossyMode: { videoEncoder: 'libx264' | 'libx265' | 'libsvtav1' } | undefined;
    disableNetworking: boolean;
    newVersion: string | undefined;
}

export interface FileStat {
    size: number;
    atimeMs: number;
    mtimeMs: number;
    ctimeMs: number;
    birthtimeMs: number;
    isFile: boolean;
    isDirectory: boolean;
}

export interface FfRunOptions {
    /** Used to route progress events and to abort a single job */
    jobId?: string;
    /** Total duration in seconds; enables progress events */
    duration?: number;
    /** Text piped to stdin (used for concat lists) */
    stdinText?: string;
    timeout?: number;
    logCli?: boolean;
}

export interface FfRunResult {
    stdout: string;
    stderr: string;
    exitCode: number | undefined;
    command: string;
}

export interface DetectedSegment {
    start: number;
    end: number;
}

export interface DetectOptions {
    jobId: string;
    filePath: string;
    streamId: number | undefined;
    from: number;
    to: number;
    ffmpegHwaccel: FfmpegHwAccel;
}

export interface OpenDialogOptions {
    title?: string;
    defaultPath?: string;
    buttonLabel?: string;
    filters?: { name: string; extensions: string[]; }[];
    properties?: ('openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles' | 'createDirectory' | 'promptToCreate' | 'dontAddToRecent')[];
    message?: string;
}

export interface SaveDialogOptions {
    title?: string;
    defaultPath?: string;
    buttonLabel?: string;
    filters?: { name: string; extensions: string[]; }[];
    message?: string;
}

export interface MessageBoxOptions {
    type?: 'none' | 'info' | 'error' | 'question' | 'warning';
    title?: string;
    message: string;
    detail?: string;
    buttons?: string[];
    defaultId?: number;
    cancelId?: number;
}

export interface CompatStreamParams {
    path: string;
    videoStreamIndex?: number | undefined;
    audioStreams: AudioStreamInfo[];
    seekTo: number;
    size?: number | undefined;
    fps?: number | undefined;
    rotate: number | undefined;
    ffmpegHwaccel: FfmpegHwAccel;
}

/** Native menu state the renderer pushes to main so menu items can be enabled/checked */
export interface MenuState {
    isFileOpened: boolean;
    hasSegments: boolean;
    canUndo: boolean;
    canRedo: boolean;
}

/**
 * Every function the renderer can call in the main process.
 * Implemented in electron/main/ipc/handlers.ts, exposed by the preload as window.mainApi.
 */
export interface MainApi {
    // app
    getAppInfo(): Promise<AppInfo>;
    rendererReady(): Promise<void>;
    quitApp(): Promise<void>;
    focusWindow(): Promise<void>;
    setProgressBar(progress: number): Promise<void>;
    sendOsNotification(options: { title: string; body?: string; }): Promise<void>;
    openExternal(url: string): Promise<void>;
    setAskBeforeClose(value: boolean): Promise<void>;
    setLanguage(language: string | null): Promise<void>;
    setMenuState(state: MenuState): Promise<void>;
    apiActionResponse(id: number): Promise<void>;
    emitAppEvent(event: AppEvent): Promise<void>;
    toggleFullscreen(): Promise<void>;
    toggleDevTools(): Promise<void>;

    // config
    configGetAll(): Promise<Config>;
    configSet<K extends keyof Config>(key: K, value: Config[K]): Promise<void>;
    configReset<K extends keyof Config>(key: K): Promise<Config[K]>;

    // dialogs
    showOpenDialog(options: OpenDialogOptions): Promise<{ canceled: boolean; filePaths: string[]; }>;
    showSaveDialog(options: SaveDialogOptions): Promise<{ canceled: boolean; filePath: string | undefined; }>;
    showMessageBox(options: MessageBoxOptions): Promise<{ response: number; }>;

    // fs
    pathExists(path: string): Promise<boolean>;
    stat(path: string): Promise<FileStat>;
    lstat(path: string): Promise<FileStat>;
    /** Throws an error with Node's `code` (ENOENT, EACCES, EPERM...) if not accessible */
    access(path: string, mode: 'exists' | 'read' | 'write'): Promise<void>;
    readTextFile(path: string): Promise<string>;
    readBinaryFile(path: string): Promise<Uint8Array>;
    /** Parses a .cue file with cue-parser (which needs fs) */
    parseCueSheet(path: string): Promise<unknown>;
    writeTextFile(path: string, text: string): Promise<void>;
    writeBinaryFile(path: string, data: Uint8Array): Promise<void>;
    readdir(path: string, recursive?: boolean): Promise<string[]>;
    mkdir(path: string): Promise<void>;
    rename(from: string, to: string): Promise<void>;
    unlink(path: string): Promise<void>;
    utimes(path: string, atime: number, mtime: number): Promise<void>;
    trashItem(path: string): Promise<void>;
    showItemInFolder(path: string): Promise<void>;
    getMimeType(path: string): Promise<string | undefined>;

    // clipboard
    writeClipboardText(text: string): Promise<void>;
    readClipboardText(): Promise<string>;
    writeClipboardImage(data: Uint8Array): Promise<void>;

    // ffmpeg
    ffCheckExists(): Promise<{ ffmpeg: boolean; ffprobe: boolean; ffmpegPath: string; ffprobePath: string; }>;
    ffSetCustomPath(path: string | undefined): Promise<void>;
    ffRun(cmd: FfCommand, args: string[], options?: FfRunOptions): Promise<FfRunResult>;
    ffAbortJob(jobId: string): Promise<void>;
    ffAbortAll(): Promise<void>;
    ffRenderWaveformPng(params: { filePath: string; start?: number; duration?: number; resample?: number; color: string; streamIndex: number; timeout?: number; }): Promise<Uint8Array>;
    ffDetectSceneChanges(params: DetectOptions & { minChange: number | string; }): Promise<{ segments: DetectedSegment[]; command: string; }>;
    ffBlackDetect(params: DetectOptions & { filterOptions: Record<string, string>; boundingMode: boolean; }): Promise<{ segments: DetectedSegment[]; command: string; }>;
    ffSilenceDetect(params: DetectOptions & { filterOptions: Record<string, string>; boundingMode: boolean; }): Promise<{ segments: DetectedSegment[]; command: string; }>;
    ffCaptureFrames(params: { jobId?: string; from: number; to?: number | undefined; videoPath: string; outPathTemplate: string; quality: number; filter?: string | undefined; framePts?: boolean | undefined; captureFormat: CaptureFormat; }): Promise<string[]>;
    ffCaptureFrameToClipboard(params: { timestamp: number; videoPath: string; quality: number; }): Promise<void>;
    ffCaptureFrameToFile(params: { timestamp: number; videoPath: string; outPath: string; quality: number; }): Promise<string[]>;
    ffCaptureFrameToBuffer(params: { timestamp: number; videoPath: string; quality: number; width?: number; }): Promise<Uint8Array>;
    ffDownloadMediaUrl(url: string, outPath: string): Promise<void>;
    /** Registers stream params and returns a media-compat:// URL that streams fragmented mp4 */
    ffCreateCompatStream(params: CompatStreamParams): Promise<string>;
    ffAbortCompatStream(url: string): Promise<void>;
}

export type AppEvent =
    | { eventName: 'export-complete'; paths?: string[]; }
    | { eventName: 'export-start'; path: string; };

/** Events sent from main to renderer (window.mainEvents.on) */
export interface MainEvents {
    openFiles: [paths: string[]];
    /** A menu item or HTTP API call asks the renderer to run an action from the actions registry */
    action: [name: string, args?: unknown[]];
    apiAction: [request: ApiActionRequest];
    ffProgress: [jobId: string, progress: number];
    ffSegmentDetected: [jobId: string, segment: DetectedSegment];
    fullscreenChanged: [isFullscreen: boolean];
    /** The update check found a newer release (also available later as AppInfo.newVersion) */
    newVersionAvailable: [version: string];
}

export type MainEventName = keyof MainEvents;

export interface MainEventsApi {
    on<E extends MainEventName>(event: E, listener: (...args: MainEvents[E]) => void): () => void;
}

/** Synchronous Node path helpers exposed by the preload (Node's real `path` module, platform aware) */
export interface NodePathApi {
    sep: string;
    delimiter: string;
    join(...parts: string[]): string;
    resolve(...parts: string[]): string;
    normalize(p: string): string;
    dirname(p: string): string;
    basename(p: string, ext?: string): string;
    extname(p: string): string;
    isAbsolute(p: string): boolean;
    relative(from: string, to: string): string;
    parse(p: string): { root: string; dir: string; base: string; ext: string; name: string; };
    format(p: { root?: string; dir?: string; base?: string; ext?: string; name?: string; }): string;
}

export interface PreloadEnv {
    platform: string;
    arch: string;
    /** Absolute path of a File from drag and drop or <input type=file> */
    getPathForFile(file: File): string;
    toMediaUrl(path: string): string;
}

/** Method names, used by the preload to build window.mainApi without a Proxy (contextBridge can't clone a Proxy) */
export const mainApiMethods = [
    'getAppInfo', 'rendererReady', 'quitApp', 'focusWindow', 'setProgressBar', 'sendOsNotification', 'openExternal',
    'setAskBeforeClose', 'setLanguage', 'setMenuState', 'apiActionResponse', 'emitAppEvent', 'toggleFullscreen', 'toggleDevTools',
    'configGetAll', 'configSet', 'configReset',
    'showOpenDialog', 'showSaveDialog', 'showMessageBox',
    'pathExists', 'stat', 'lstat', 'access', 'readTextFile', 'readBinaryFile', 'parseCueSheet', 'writeTextFile', 'writeBinaryFile', 'readdir', 'mkdir',
    'rename', 'unlink', 'utimes', 'trashItem', 'showItemInFolder', 'getMimeType',
    'writeClipboardText', 'readClipboardText', 'writeClipboardImage',
    'ffCheckExists', 'ffSetCustomPath', 'ffRun', 'ffAbortJob', 'ffAbortAll', 'ffRenderWaveformPng', 'ffDetectSceneChanges',
    'ffBlackDetect', 'ffSilenceDetect', 'ffCaptureFrames', 'ffCaptureFrameToClipboard', 'ffCaptureFrameToFile', 'ffCaptureFrameToBuffer',
    'ffDownloadMediaUrl', 'ffCreateCompatStream', 'ffAbortCompatStream',
] as const satisfies readonly (keyof MainApi)[];

type MissingMethods = Exclude<keyof MainApi, typeof mainApiMethods[number]>;
const _allMethodsListed: MissingMethods extends never ? true : MissingMethods = true;

export const IPC_INVOKE_CHANNEL = 'main-api';
export const MEDIA_PROTOCOL = 'media';
export const COMPAT_PROTOCOL = 'media-compat';

/** media://local/<encoded absolute path> */
export function toMediaUrl(path: string) {
    return `${MEDIA_PROTOCOL}://local/${encodeURIComponent(path)}`;
}
