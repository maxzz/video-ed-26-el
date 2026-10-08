import { MenubarContent, MenubarMenu, MenubarSeparator, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarTrigger } from "@/ui/shadcn/menubar";
import { useTranslation } from "react-i18next";

import { type EdlExportType, type EdlImportType } from "@/editor/0-core/8-lib/9-types-core";
import { getAppInfo } from "@/editor/0-core/7-actions/0-main-api";
import { MenuActionItem, modShortcut } from "./8-menu-item";

export function TopMenu_File() {
    const { isMac } = getAppInfo();
    const { t } = useTranslation();
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
