import type { DragEvent } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/shadcn/button';
import { cn } from '@/utils/classnames';
import { BabyIcon, FilterIcon, ListIcon, LockIcon, MoonIcon, PanelRightIcon, SettingsIcon, SunIcon, UnlockIcon } from 'lucide-react';
import { jotaiDefaultStore } from '@/utils/local-utils/9-jotai-default-store';
import { mainApi, preloadEnv } from '@/editor/0-core/7-actions/0-main-api';

import { customOutDirAtom, setCustomOutDir, userSettingsAtom } from '@/editor/0-core/9-state/user-settings.ts';
import { runAction } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { settingsVisibleAtom, streamsSelectorShownAtom } from '@/components/2-main/0-all/a-panels-atoms';
import { filePathAtom, isCustomFormatSelectedAtom, numStreamsTotalAtom } from '@/editor/2-file/9-state/a-file-atoms';
import { toggleSimpleMode } from '@/editor/4-timeline/7-actions/timeline-actions.ts';
import { enabledStreamsFilterAtom, numStreamsToCopyAtom } from '@/editor/6-streams/9-state/a-streams-store';
import { changeEnabledStreamsFilter, toggleStripCurrentFilter } from '@/editor/6-streams/7-actions/streams-actions.tsx';
import { toggleOutFormatLocked } from '@/editor/7-export/7-actions/export-actions.ts';
import { ExportModeButton } from '@/editor/7-export/0-ui/export-buttons.tsx';
import { OutDirSelector } from '@/editor/7-export/0-ui/out-dir-selector.tsx';
import { CurrentFileOutputFormatSelect } from '@/editor/7-export/0-ui/output-format-select.tsx';

// Port of upstream TopMenu.tsx

export function MainArea_Toolbar() {
    const { t } = useTranslation();
    const filePath = useAtomValue(filePathAtom);
    const customOutDir = useAtomValue(customOutDirAtom);
    const { simpleMode, outFormatLocked, darkMode } = useAtomValue(userSettingsAtom);
    const isCustomFormatSelected = useAtomValue(isCustomFormatSelectedAtom);
    const numStreamsToCopy = useAtomValue(numStreamsToCopyAtom);
    const numStreamsTotal = useAtomValue(numStreamsTotalAtom);
    const enabledStreamsFilter = useAtomValue(enabledStreamsFilterAtom);

    const DarkModeIcon = darkMode ? SunIcon : MoonIcon;
    const FormatLockIcon = outFormatLocked ? LockIcon : UnlockIcon;

    return (
        <div className="px-1.5 py-1 min-h-9 text-xs bg-muted/40 border-b flex flex-wrap items-center justify-between gap-1.5">
            {filePath && (<>
                <Button variant="outline" size="xs" onClick={() => jotaiDefaultStore.set(streamsSelectorShownAtom, true)}>
                    <ListIcon />
                    {t('Tracks')} ({numStreamsToCopy}/{numStreamsTotal})
                </Button>

                {enabledStreamsFilter != null && (
                    <Button variant="outline" size="icon-xs" title={t('Toggle tracks using current filter')} onClick={toggleStripCurrentFilter}>
                        <FilterIcon />
                    </Button>
                )}

                <Button variant="outline" size="xs" onClick={changeEnabledStreamsFilter}>
                    {enabledStreamsFilter == null && <FilterIcon />}
                    {t('Filter tracks')}
                </Button>
            </>)}

            <div className="grow" />

            <OutDirSelector>
                <Button variant="outline" size="xs" title={customOutDir} onDragOver={(e) => e.preventDefault()} onDrop={onWorkingDirDrop}>
                    {customOutDir ? t('Working dir set') : t('Working dir unset')}
                </Button>
            </OutDirSelector>

            <CurrentFileOutputFormatSelect className="h-6 max-w-28 text-xs" />

            {!simpleMode && (isCustomFormatSelected || outFormatLocked) && (
                <Button variant="outline" size="icon-xs" className={cn(outFormatLocked && 'text-primary')} title={t('Lock/unlock output format')} onClick={toggleOutFormatLocked}>
                    <FormatLockIcon />
                </Button>
            )}

            {filePath && <ExportModeButton className="h-6 w-36 text-xs" />}

            <Button variant="outline" size="icon-xs" className={cn(simpleMode && 'text-primary')} title={t('Toggle advanced view')} onClick={toggleSimpleMode}>
                <BabyIcon />
            </Button>

            {!simpleMode && (
                <Button variant="outline" size="icon-xs" title={t('Toggle dark mode')} onClick={() => runAction('toggleDarkMode')}>
                    <DarkModeIcon />
                </Button>
            )}

            <Button variant="outline" size="icon-xs" title={t('Segments')} onClick={() => runAction('toggleSegmentsList')}>
                <PanelRightIcon />
            </Button>

            <Button variant="outline" size="icon-xs" title={t('Settings')} onClick={() => jotaiDefaultStore.set(settingsVisibleAtom, true)}>
                <SettingsIcon />
            </Button>
        </div>
    );
}

// Convenience for drag and drop: https://github.com/mifi/lossless-cut/issues/2147
async function onWorkingDirDrop(ev: DragEvent<HTMLButtonElement>) {
    ev.preventDefault();
    const paths = [...ev.dataTransfer.files].map((f) => preloadEnv.getPathForFile(f));
    const [firstPath] = paths;
    if (paths.length === 1 && firstPath && (await mainApi.stat(firstPath)).isDirectory) {
        setCustomOutDir(firstPath);
    }
}
