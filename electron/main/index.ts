import { app } from 'electron';
import i18n from 'i18next';
import JSON5 from 'json5';
import { appName } from '@shared/constants.ts';
import type { Config } from '@shared/types.ts';
import logger from './logger.ts';
import * as configStore from './config-store.ts';
import { appState } from './app-state.ts';
import { emitToRenderer } from './events.ts';
import { createWindow } from './window.ts';
import { updateMenu } from './menu.ts';
import { registerIpcHandlers } from './ipc/handlers.ts';
import { registerMediaSchemes, handleMediaProtocols } from './protocol-media.ts';
import { setCustomFfPath } from './ffmpeg/paths.ts';
import { abortAll } from './ffmpeg/ffmpeg.ts';
import { parseCliArgs, parseLossyMode, getFilesFromArgs } from './cli.ts';
import { initI18n, setCustomLocalesPath } from './i18n.ts';
import { getAboutPanelOptions } from './about-panel.ts';
import { checkNewVersion } from './update-checker.ts';
import { createHttpServer } from './http-server/index.ts';
import { sendApiAction, awaitAppEvent } from './api-actions.ts';
import { isDev, isStoreBuild, isWindows } from './util.ts';

process.on('uncaughtException', (err) => logger.error('uncaughtException', err));
process.on('unhandledRejection', (err) => logger.error('unhandledRejection', err));

// https://chromestatus.com/feature/5748496434987008
app.commandLine.appendSwitch('enable-blink-features', 'AudioVideoTracks');

app.name = appName;
if (isWindows) {
    // needed for the title of OS notifications on Windows https://github.com/mifi/lossless-cut/pull/2139
    app.setAppUserModelId(app.name);
}

registerMediaSchemes();

const argv = parseCliArgs();
appState.lossyMode = parseLossyMode(argv['lossyMode']);
if (argv['localesPath'] != null) {
    setCustomLocalesPath(String(argv['localesPath']));
}

function openFilesEventually(paths: string[]) {
    if (appState.rendererReady) {
        emitToRenderer('openFiles', paths);
    } else {
        appState.filesToOpen = paths;
    }
}

// Call immediately to not miss the event (race condition)
const readyPromise = app.whenReady();

async function init() {
    try {
        logger.info(appName, 'version', app.getVersion(), { isDev });
        await configStore.init({ customConfigDir: argv['configDir'] as string | undefined });

        if (!configStore.get('allowMultipleInstances') && !app.requestSingleInstanceLock({ argv: process.argv })) {
            logger.info('Found running instance, quitting');
            app.quit();
            return;
        }

        app.on('second-instance', (_event, _commandLine, workingDirectory, additionalData) => {
            const win = appState.mainWindow;
            if (win) {
                if (win.isMinimized()) {
                    win.restore();
                }
                win.focus();
            }
            if (!(additionalData != null && typeof additionalData === 'object' && 'argv' in additionalData) || !Array.isArray(additionalData.argv)) {
                return;
            }
            const argv2 = parseCliArgs(additionalData.argv);
            logger.info('second-instance', argv2);
            if (argv2['keyboardAction']) {
                let args: unknown[];
                try {
                    args = argv2._.map((arg) => JSON.parse(String(arg)));
                } catch (err) {
                    logger.error('Invalid --keyboard-action arguments, expected JSON', err);
                    return;
                }
                sendApiAction(String(argv2['keyboardAction']), args);
            } else {
                const files = getFilesFromArgs(argv2, workingDirectory);
                if (files.length > 0) {
                    openFilesEventually(files);
                }
            }
        });

        app.on('window-all-closed', () => {
            abortAll();
            app.quit();
        });

        app.on('activate', () => {
            if (appState.mainWindow === null) {
                createWindow();
            }
        });

        // macOS "open with"
        app.on('open-file', (event, path) => {
            openFilesEventually([path]);
            event.preventDefault();
        });

        registerIpcHandlers();

        await readyPromise;

        handleMediaProtocols();

        logger.info('CLI arguments', argv);
        if (appState.filesToOpen.length === 0) {
            appState.filesToOpen = getFilesFromArgs(argv);
        }

        appState.disableNetworking = !!argv['disableNetworking'];

        const settingsJson = argv['settingsJson'] as string | undefined;
        if (settingsJson != null) {
            logger.info('initializing settings', settingsJson);
            Object.entries(JSON5.parse(settingsJson) as Partial<Config>).forEach(([key, value]) => {
                configStore.set(key as keyof Config, value as never);
            });
        }

        setCustomFfPath(configStore.get('customFfPath'));

        const { httpApi } = argv;
        if (httpApi != null) {
            const port = typeof httpApi === 'number' ? httpApi : 8080;
            await createHttpServer({ port, onKeyboardAction: sendApiAction, onAwaitAppEvent: awaitAppEvent }).startHttpServer();
        }

        await initI18n(configStore.get('language'));
        app.setAboutPanelOptions(getAboutPanelOptions());
        // https://www.electronjs.org/docs/latest/api/app#appsetaboutpaneloptionsoptions
        i18n.on('languageChanged', () => app.setAboutPanelOptions(getAboutPanelOptions()));
        createWindow();
        updateMenu();

        if (!appState.disableNetworking && configStore.get('enableUpdateCheck') && !isDev && !isStoreBuild) {
            appState.newVersion = await checkNewVersion();
            if (appState.newVersion) {
                updateMenu();
                emitToRenderer('newVersionAvailable', appState.newVersion);
            }
        }
    } catch (err) {
        logger.error('Failed to initialize', err);
    }
}

// cannot use top level await because app.whenReady would hang forever
init();
