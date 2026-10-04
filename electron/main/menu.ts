import { app, Menu, shell, type MenuItemConstructorOptions } from 'electron';
import { appName, homepageUrl, getReleaseUrl, licensesUrl, thanksUrl, usageUrl, faqUrl, troubleshootingUrl, featureRequestUrl, githubUrl } from '@shared/constants.ts';
import { logFilePath } from './logger.ts';
import { getConfigPath } from './config-store.ts';
import { appState } from './app-state.ts';
import { emitToRenderer } from './events.ts';
import { handlers } from './ipc/handlers.ts';
import { t } from './i18n.ts';

// menu-safe i18n.t https://github.com/mifi/lossless-cut/issues/1456
const esc = (val: string) => val.replaceAll('&', '&&');

const isMac = process.platform === 'darwin';

/** Menu item that runs an action from the renderer's actions registry */
function action(label: string, name: string, args?: unknown[], extra?: Partial<MenuItemConstructorOptions>): MenuItemConstructorOptions {
    return { label: esc(t(label)), click: () => emitToRenderer('action', name, args), ...extra };
}

const openExternal = (url: string) => handlers.openExternal(url);

export function updateMenu() {
    const importFormats: [string, string][] = [
        ['Times in seconds (CSV)', 'csv'],
        ['Frame numbers (CSV)', 'csv-frames'],
        ['Cutlist', 'cutlist'],
        ['EDL', 'edl'],
        ['Text chapters / YouTube', 'youtube'],
        ['DaVinci Resolve / Final Cut Pro XML', 'xmeml'],
        ['Final Cut Pro FCPX / FCPXML', 'fcpxml'],
        ['CUE sheet file', 'cue'],
        ['PotPlayer Bookmarks (.pbf)', 'pbf'],
        ['Subtitles (SRT)', 'srt'],
        ['DV Analyzer Summary.txt', 'dv-analyzer-summary-txt'],
        ['OpenTimelineIO', 'otio'],
    ];
    const exportFormats: [string, string][] = [
        ['Times in seconds (CSV)', 'csv'],
        ['Timestamps (CSV)', 'csv-human'],
        ['Frame numbers (CSV)', 'csv-frames'],
        ['Timestamps (TSV/TXT)', 'tsv-human'],
        ['Subtitles (SRT)', 'srt'],
    ];

    const template: MenuItemConstructorOptions[] = [
        ...(isMac ? [{ role: 'appMenu' as const }] : []),
        {
            label: esc(t('File')),
            submenu: [
                action('Open', 'openFilesDialog', undefined, { accelerator: 'CmdOrCtrl+O' }),
                action('Open folder', 'openDirDialog'),
                action('Open URL', 'promptDownloadMediaUrl'),
                { type: 'separator' },
                action('Close', 'closeCurrentFile', undefined, { accelerator: 'CmdOrCtrl+W' }),
                action('Close batch', 'closeBatch'),
                { type: 'separator' },
                action('Import project (LLC)...', 'importEdlFile', ['llc']),
                action('Export project (LLC)...', 'exportEdlFile', ['llc']),
                { label: esc(t('Import project')), submenu: importFormats.map(([label, type]) => action(label, 'importEdlFile', [type])) },
                {
                    label: esc(t('Export project')),
                    submenu: [
                        ...exportFormats.map(([label, type]) => action(label, 'exportEdlFile', [type])),
                        action('Start times as YouTube Chapters', 'exportYouTube'),
                    ],
                },
                { type: 'separator' },
                action('Convert to supported format', 'html5ify'),
                action('Fix incorrect duration', 'fixInvalidDuration'),
                action('Decimate video', 'decimate'),
                { type: 'separator' },
                action('Settings', 'toggleSettings', undefined, { accelerator: 'CmdOrCtrl+,' }),
                ...(!isMac ? [{ type: 'separator' } as const, { label: esc(t('Exit')), click: () => app.quit() }] : []),
            ],
        },
        {
            label: esc(t('Edit')),
            submenu: [
                // https://github.com/mifi/lossless-cut/issues/610
                { role: 'undo', label: esc(t('Undo')) },
                { role: 'redo', label: esc(t('Redo')) },
                { type: 'separator' },
                { role: 'cut', label: esc(t('Cut')) },
                { role: 'copy', label: esc(t('Copy')) },
                { role: 'paste', label: esc(t('Paste')) },
                { role: 'selectAll', label: esc(t('Select All')) },
                { type: 'separator' },
                {
                    label: esc(t('Tracks')),
                    submenu: [
                        action('Extract all tracks', 'extractAllStreams'),
                        action('Edit tracks / metadata tags', 'showStreamsSelector'),
                    ],
                },
            ],
        },
        {
            label: esc(t('Segments')),
            submenu: [
                action('Create num segments', 'createNumSegments'),
                action('Create fixed duration segments', 'createFixedDurationSegments'),
                action('Create byte sized segments', 'createFixedByteSizedSegments'),
                action('Create random segments', 'createRandomSegments'),
                { type: 'separator' },
                action('Reorder segments by start time', 'reorderSegsByStartTime'),
                action('Shuffle segments order', 'shuffleSegments'),
                { type: 'separator' },
                action('Combine overlapping segments', 'combineOverlappingSegments'),
                action('Combine selected segments', 'combineSelectedSegments'),
                action('Split segment at cursor', 'splitCurrentSegment'),
                action('Invert all segments on timeline', 'invertAllSegments'),
                action('Fill gaps between segments', 'fillSegmentsGaps'),
                { type: 'separator' },
                action('Shift all segments on timeline', 'shiftAllSegmentTimes'),
                action('Align segment times to keyframes', 'alignSegmentTimesToKeyframes'),
                { type: 'separator' },
                action('Select segments by expression', 'selectSegmentsByExpr'),
                action('Edit segments by expression', 'mutateSegmentsByExpr'),
                { type: 'separator' },
                action('Clear all segments', 'clearSegments'),
            ],
        },
        {
            label: esc(t('View')),
            submenu: [
                ...(process.platform === 'win32' ? [
                    { role: 'minimize' as const, label: esc(t('Minimize')) },
                    { role: 'zoom' as const, label: esc(t('Maximize')) },
                ] : []),
                { role: 'togglefullscreen', label: esc(t('Toggle Full Screen')) },
                { role: 'resetZoom', label: esc(t('Reset font size')) },
                { role: 'zoomIn', label: esc(t('Increase font size')) },
                { role: 'zoomOut', label: esc(t('Decrease font size')) },
                { type: 'separator' },
                // the renderer handles the shortcut (also Ctrl+K), here it is only displayed
                action('Command palette', 'toggleCommandPalette', undefined, { accelerator: 'CmdOrCtrl+Shift+P', registerAccelerator: false }),
            ],
        },
        // On Windows the windowMenu has Ctrl+W which clashes with File->Close
        ...(isMac ? [{ role: 'windowMenu' as const, label: esc(t('Window')) }] : []),
        {
            label: esc(t('Tools')),
            submenu: [
                action('Merge/concatenate files', 'concatBatch'),
                action('Set custom start offset/timecode', 'setStartTimeOffset'),
                action('Detect black scenes', 'detectBlackScenes'),
                action('Detect silent scenes', 'detectSilentScenes'),
                action('Detect scene changes', 'detectSceneChanges'),
                action('Read all keyframes', 'readAllKeyframes'),
                action('Create segments from keyframes', 'createSegmentsFromKeyframes'),
                action('Last ffmpeg commands', 'toggleLastCommands'),
                { type: 'separator' },
                { role: 'toggleDevTools', label: esc(t('Toggle Developer Tools')) },
            ],
        },
        {
            role: 'help',
            label: esc(t('Help')),
            submenu: [
                { label: esc(t('How to use')), click: () => openExternal(usageUrl) },
                { label: esc(t('FAQ')), click: () => openExternal(faqUrl) },
                { label: esc(t('Troubleshooting')), click: () => openExternal(troubleshootingUrl) },
                action('Keyboard & mouse shortcuts', 'toggleKeyboardShortcuts'),
                { label: esc(t('Learn More')), click: () => openExternal(homepageUrl) },
                { type: 'separator' },
                action('Report an error', 'openSendReportDialog'),
                { label: esc(t('Feature request')), click: () => openExternal(featureRequestUrl) },
                { label: esc(`${t('Donate')} (LosslessCut)`), click: () => openExternal(thanksUrl) },
                { type: 'separator' },
                { label: esc(t('Configuration file')), click: () => shell.showItemInFolder(getConfigPath()) },
                { label: esc(t('Log file')), click: () => shell.openPath(logFilePath) },
                { type: 'separator' },
                { label: esc(t('Source code')), click: () => openExternal(githubUrl) },
                { label: esc(t('Licenses')), click: () => openExternal(licensesUrl) },
                ...(!isMac ? [{ role: 'about' as const, label: esc(`${t('About')} ${appName}`) }] : []),
            ],
        },
    ];

    const { newVersion } = appState;
    if (newVersion) {
        template.push({
            label: esc(t('New version!')),
            submenu: [{ label: esc(t('Download {{version}}', { version: newVersion })), click: () => openExternal(getReleaseUrl(newVersion)) }],
        });
    }

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
