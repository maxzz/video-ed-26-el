import { useAtomValue } from 'jotai';
import { Menubar, MenubarContent, MenubarMenu, MenubarSeparator, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarTrigger } from '@/ui/shadcn/menubar';
import { useTranslation } from 'react-i18next';

import { type EdlExportType, type EdlImportType } from '@/editor/0-core/8-lib/9-types-core.ts';
import { appName, faqUrl, featureRequestUrl, getReleaseUrl, githubUrl, homepageUrl, licensesUrl, thanksUrl, troubleshootingUrl, usageUrl } from '@shared/constants.ts';
import { getAppInfo } from '@/editor/0-core/7-actions/0-main-api.ts';
import { newVersionAtom } from '@/editor/f-platform/9-state/platform.ts';
import { canRedoAtom, canUndoAtom } from '@/editor/5-segments/9-state/segments-store.ts';
import { MenuActionItem, modShortcut } from './8-menu-item.tsx';

export function TopMenu_All() {
    const newVersion = useAtomValue(newVersionAtom);
    return (
        <Menubar className="grow p-0 min-w-0 h-auto bg-transparent border-0 rounded-none">
            <TopMenu_File />
            <TopMenu_Edit />
            <TopMenu_Segments />
            <TopMenu_ViewM />
            <TopMenu_Tools />
            <TopMenu_Help />
            {newVersion != null && <TopMenu_NewVersion version={newVersion} />}
        </Menubar>
    );
}

function TopMenu_File() {
    const { t } = useTranslation();
    const { isMac } = getAppInfo();
    return (
        <MenubarMenu>
            <MenubarTrigger>{t('File')}</MenubarTrigger>
            <MenubarContent className="min-w-72">
                <MenuActionItem label={t('Open')} shortcut={modShortcut('O')} action={{ what: 'openFilesDialog' }} />
                <MenuActionItem label={t('Open folder')} action={{ what: 'openDirDialog' }} />
                <MenuActionItem label={t('Open URL')} action={{ what: 'promptDownloadMediaUrl' }} />
                <MenubarSeparator />
                <MenuActionItem label={t('Close')} shortcut={modShortcut('W')} action={{ what: 'closeCurrentFile' }} />
                <MenuActionItem label={t('Close batch')} action={{ what: 'closeBatch' }} />
                <MenubarSeparator />
                <MenuActionItem label={t('Import project (LLC)...')} action={{ what: 'importEdlFile', format: 'llc' }} />
                <MenuActionItem label={t('Export project (LLC)...')} action={{ what: 'exportEdlFile', format: 'llc' }} />
                <MenubarSub>
                    <MenubarSubTrigger>{t('Import project')}</MenubarSubTrigger>
                    <MenubarSubContent className="min-w-72">
                        {importFormats.map(
                            ([label, format]) => (
                                <MenuActionItem key={format} label={t(label)} action={{ what: 'importEdlFile', format }} />
                            )
                        )}
                    </MenubarSubContent>
                </MenubarSub>
                <MenubarSub>
                    <MenubarSubTrigger>{t('Export project')}</MenubarSubTrigger>
                    <MenubarSubContent className="min-w-72">
                        {exportFormats.map(
                            ([label, format]) => (
                                <MenuActionItem key={format} label={t(label)} action={{ what: 'exportEdlFile', format }} />
                            )
                        )}
                        <MenuActionItem label={t('Start times as YouTube Chapters')} action={{ what: 'exportYouTube' }} />
                    </MenubarSubContent>
                </MenubarSub>
                <MenubarSeparator />
                <MenuActionItem label={t('Convert to supported format')} action={{ what: 'html5ify' }} />
                <MenuActionItem label={t('Fix incorrect duration')} action={{ what: 'fixInvalidDuration' }} />
                <MenuActionItem label={t('Decimate video')} action={{ what: 'decimate' }} />
                <MenubarSeparator />
                <MenuActionItem label={t('Settings')} shortcut={modShortcut(',')} action={{ what: 'toggleSettings' }} />
                {!isMac && (<>
                    <MenubarSeparator />
                    <MenuActionItem label={t('Exit')} action={{ what: 'quit' }} />
                </>)}
            </MenubarContent>
        </MenubarMenu>
    );
}

const importFormats = [
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
] as const satisfies readonly (readonly [string, EdlImportType])[];

const exportFormats = [
    ['Times in seconds (CSV)', 'csv'],
    ['Timestamps (CSV)', 'csv-human'],
    ['Frame numbers (CSV)', 'csv-frames'],
    ['Timestamps (TSV/TXT)', 'tsv-human'],
    ['Subtitles (SRT)', 'srt'],
] as const satisfies readonly (readonly [string, EdlExportType])[];

function TopMenu_Edit() {
    const { t } = useTranslation();
    const canUndo = useAtomValue(canUndoAtom);
    const canRedo = useAtomValue(canRedoAtom);
    return (
        <MenubarMenu>
            <MenubarTrigger>{t('Edit')}</MenubarTrigger>
            <MenubarContent className="min-w-56">
                <MenuActionItem label={t('Undo')} disabled={!canUndo} action={{ what: 'undo' }} />
                <MenuActionItem label={t('Redo')} disabled={!canRedo} action={{ what: 'redo' }} />
                <MenubarSeparator />
                <MenuActionItem label={t('Cut')} action={{ what: 'edit', command: 'cut' }} />
                <MenuActionItem label={t('Copy')} action={{ what: 'edit', command: 'copy' }} />
                <MenuActionItem label={t('Paste')} action={{ what: 'edit', command: 'paste' }} />
                <MenuActionItem label={t('Select All')} action={{ what: 'edit', command: 'selectAll' }} />
                <MenubarSeparator />
                <MenubarSub>
                    <MenubarSubTrigger>{t('Tracks')}</MenubarSubTrigger>
                    <MenubarSubContent className="min-w-56">
                        <MenuActionItem label={t('Extract all tracks')} action={{ what: 'extractAllStreams' }} />
                        <MenuActionItem label={t('Edit tracks / metadata tags')} action={{ what: 'showStreamsSelector' }} />
                    </MenubarSubContent>
                </MenubarSub>
            </MenubarContent>
        </MenubarMenu>
    );
}

function TopMenu_Segments() {
    const { t } = useTranslation();
    return (
        <MenubarMenu>
            <MenubarTrigger>{t('Segments')}</MenubarTrigger>
            <MenubarContent className="min-w-72">
                <MenuActionItem label={t('Create num segments')} action={{ what: 'createNumSegments' }} />
                <MenuActionItem label={t('Create fixed duration segments')} action={{ what: 'createFixedDurationSegments' }} />
                <MenuActionItem label={t('Create byte sized segments')} action={{ what: 'createFixedByteSizedSegments' }} />
                <MenuActionItem label={t('Create random segments')} action={{ what: 'createRandomSegments' }} />
                <MenubarSeparator />
                <MenuActionItem label={t('Reorder segments by start time')} action={{ what: 'reorderSegsByStartTime' }} />
                <MenuActionItem label={t('Shuffle segments order')} action={{ what: 'shuffleSegments' }} />
                <MenubarSeparator />
                <MenuActionItem label={t('Combine overlapping segments')} action={{ what: 'combineOverlappingSegments' }} />
                <MenuActionItem label={t('Combine selected segments')} action={{ what: 'combineSelectedSegments' }} />
                <MenuActionItem label={t('Split segment at cursor')} action={{ what: 'splitCurrentSegment' }} />
                <MenuActionItem label={t('Invert all segments on timeline')} action={{ what: 'invertAllSegments' }} />
                <MenuActionItem label={t('Fill gaps between segments')} action={{ what: 'fillSegmentsGaps' }} />
                <MenubarSeparator />
                <MenuActionItem label={t('Shift all segments on timeline')} action={{ what: 'shiftAllSegmentTimes' }} />
                <MenuActionItem label={t('Align segment times to keyframes')} action={{ what: 'alignSegmentTimesToKeyframes' }} />
                <MenubarSeparator />
                <MenuActionItem label={t('Select segments by expression')} action={{ what: 'selectSegmentsByExpr' }} />
                <MenuActionItem label={t('Edit segments by expression')} action={{ what: 'mutateSegmentsByExpr' }} />
                <MenubarSeparator />
                <MenuActionItem label={t('Clear all segments')} action={{ what: 'clearSegments' }} />
            </MenubarContent>
        </MenubarMenu>
    );
}

function TopMenu_ViewM() {
    const { t } = useTranslation();
    const { isWindows } = getAppInfo();
    return (
        <MenubarMenu>
            <MenubarTrigger>{t('View')}</MenubarTrigger>
            <MenubarContent className="min-w-56">
                {isWindows && (
                    <>
                        <MenuActionItem label={t('Minimize')} shortcut="Ctrl+M" action={{ what: 'minimize' }} />
                        <MenuActionItem label={t('Maximize')} action={{ what: 'toggleMaximize' }} />
                    </>
                )}
                <MenuActionItem label={t('Toggle Full Screen')} shortcut="F11" action={{ what: 'toggleFullscreen' }} />
                <MenuActionItem label={t('Reset font size')} shortcut={modShortcut('0')} action={{ what: 'zoom', direction: 'reset' }} />
                <MenuActionItem label={t('Increase font size')} shortcut={modShortcut('+')} action={{ what: 'zoom', direction: 'in' }} />
                <MenuActionItem label={t('Decrease font size')} shortcut={modShortcut('-')} action={{ what: 'zoom', direction: 'out' }} />
                <MenubarSeparator />
                <MenuActionItem label={t('Command palette')} shortcut={modShortcut('P', true)} action={{ what: 'toggleCommandPalette' }} />
            </MenubarContent>
        </MenubarMenu>
    );
}

function TopMenu_Tools() {
    const { t } = useTranslation();
    return (
        <MenubarMenu>
            <MenubarTrigger>{t('Tools')}</MenubarTrigger>
            <MenubarContent className="min-w-64">
                <MenuActionItem label={t('Merge/concatenate files')} action={{ what: 'concatBatch' }} />
                <MenuActionItem label={t('Set custom start offset/timecode')} action={{ what: 'setStartTimeOffset' }} />
                <MenuActionItem label={t('Detect black scenes')} action={{ what: 'detectBlackScenes' }} />
                <MenuActionItem label={t('Detect silent scenes')} action={{ what: 'detectSilentScenes' }} />
                <MenuActionItem label={t('Detect scene changes')} action={{ what: 'detectSceneChanges' }} />
                <MenuActionItem label={t('Read all keyframes')} action={{ what: 'readAllKeyframes' }} />
                <MenuActionItem label={t('Create segments from keyframes')} action={{ what: 'createSegmentsFromKeyframes' }} />
                <MenuActionItem label={t('Last ffmpeg commands')} action={{ what: 'toggleLastCommands' }} />
                <MenubarSeparator />
                <MenuActionItem label={t('Toggle Developer Tools')} shortcut={modShortcut('I', true)} action={{ what: 'toggleDevTools' }} />
            </MenubarContent>
        </MenubarMenu>
    );
}

function TopMenu_Help() {
    const { t } = useTranslation();
    const { isMac, paths } = getAppInfo();
    return (
        <MenubarMenu>
            <MenubarTrigger>{t('Help')}</MenubarTrigger>
            <MenubarContent className="min-w-64">
                <MenuActionItem label={t('How to use')} action={{ what: 'openExternal', url: usageUrl }} />
                <MenuActionItem label={t('FAQ')} action={{ what: 'openExternal', url: faqUrl }} />
                <MenuActionItem label={t('Troubleshooting')} action={{ what: 'openExternal', url: troubleshootingUrl }} />
                <MenuActionItem label={t('Keyboard & mouse shortcuts')} action={{ what: 'toggleKeyboardShortcuts' }} />
                <MenuActionItem label={t('Learn More')} action={{ what: 'openExternal', url: homepageUrl }} />
                <MenubarSeparator />
                <MenuActionItem label={t('Report an error')} action={{ what: 'openSendReportDialog' }} />
                <MenuActionItem label={t('Feature request')} action={{ what: 'openExternal', url: featureRequestUrl }} />
                <MenuActionItem label={`${t('Donate')} (LosslessCut)`} action={{ what: 'openExternal', url: thanksUrl }} />
                <MenubarSeparator />
                <MenuActionItem label={t('Configuration file')} action={{ what: 'showItemInFolder', path: paths.configFile }} />
                <MenuActionItem label={t('Log file')} action={{ what: 'openPath', path: paths.logFile }} />
                <MenubarSeparator />
                <MenuActionItem label={t('Source code')} action={{ what: 'openExternal', url: githubUrl }} />
                <MenuActionItem label={t('Licenses')} action={{ what: 'openExternal', url: licensesUrl }} />
                {!isMac && <MenuActionItem label={`${t('About')} ${appName}`} action={{ what: 'showAbout' }} />}
            </MenubarContent>
        </MenubarMenu>
    );
}

function TopMenu_NewVersion({ version }: { version: string; }) {
    const { t } = useTranslation();
    return (
        <MenubarMenu>
            <MenubarTrigger>{t('New version!')}</MenubarTrigger>
            <MenubarContent>
                <MenuActionItem label={t('Download {{version}}', { version })} action={{ what: 'openExternal', url: getReleaseUrl(version) }} />
            </MenubarContent>
        </MenubarMenu>
    );
}
