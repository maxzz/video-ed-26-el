import { type DragEvent, type HTMLAttributes } from "react";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { FilterIcon, ListIcon, LockIcon, UnlockIcon } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { classNames, cn } from "@/utils";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { mainApi, preloadEnv } from "@/editor/0-core/7-actions/0-main-api";
import { customOutDirAtom, setCustomOutDir, userSettingsAtom } from "@/editor/0-core/9-state/user-settings";
import { streamsSelectorShownAtom } from "@/components/2-main/0-all/a-panels-atoms";
import { filePathAtom, isCustomFormatSelectedAtom, isFileOpenedAtom, numStreamsTotalAtom } from "@/editor/2-file/9-state/a-file-atoms";
import { shouldShowPlaybackStreamSelectorAtom } from "@/editor/3-player/9-state/a-player-atoms";
import { VolumeControl } from "@/editor/3-player/0-ui/volume-control";
import { PlaybackStreamSelector } from "@/editor/3-player/0-ui/playback-stream-selector";
import { enabledStreamsFilterAtom, numStreamsToCopyAtom } from "@/editor/6-streams/9-state/a-streams-store";
import { changeEnabledStreamsFilter, toggleStripCurrentFilter } from "@/editor/6-streams/7-actions/streams-actions";
import { toggleOutFormatLocked } from "@/editor/7-export/7-actions/export-actions";
import { Button_ExportMode } from "@/editor/7-export/0-ui/3-export-buttons";
import { Dialog_OutDirSelector } from "@/editor/7-export/0-ui/5-dlg-out-dir-selector";
import { Select_CurrentFileOutputFormat } from "@/editor/7-export/0-ui/7-output-format-select";
import { BarPlayback_StatusControls } from "./1-playback-status-controls";

/** Bottom bar on the main page. Holds track, working-directory, and export controls. */
export function StatusBar({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            role="status"
            aria-label="Status"
            className={classNames("px-1.5 min-h-8 text-xs text-foreground bg-background border-t border-border flex flex-wrap items-center justify-between gap-1.5", className)}
            {...rest}
        >
            <StatusBar_Controls />
        </div>
    );
}

function StatusBar_Controls() {
    const { t } = useTranslation();
    const filePath = useAtomValue(filePathAtom);
    const isFileOpened = useAtomValue(isFileOpenedAtom);
    const shouldShowPlaybackStreamSelector = useAtomValue(shouldShowPlaybackStreamSelectorAtom);
    const customOutDir = useAtomValue(customOutDirAtom);
    const { simpleMode, outFormatLocked } = useAtomValue(userSettingsAtom);
    const isCustomFormatSelected = useAtomValue(isCustomFormatSelectedAtom);
    const numStreamsToCopy = useAtomValue(numStreamsToCopyAtom);
    const numStreamsTotal = useAtomValue(numStreamsTotalAtom);
    const enabledStreamsFilter = useAtomValue(enabledStreamsFilterAtom);

    const FormatLockIcon = outFormatLocked ? LockIcon : UnlockIcon;

    return (<>
        <div className="flex items-center gap-1.5">
            <BarPlayback_StatusControls simpleMode={simpleMode} />

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
        </div>

        <div className="flex items-center gap-1.5">
            {isFileOpened && (<>
                <VolumeControl />
                {shouldShowPlaybackStreamSelector && <PlaybackStreamSelector />}
            </>)}

            <Dialog_OutDirSelector>
                <Button variant="outline" size="xs" title={customOutDir} onDragOver={(e) => e.preventDefault()} onDrop={onWorkingDirDrop}>
                    {customOutDir ? t('Working dir set') : t('Working dir unset')}
                </Button>
            </Dialog_OutDirSelector>

            <Select_CurrentFileOutputFormat className="h-6 max-w-28 text-xs" />

            {!simpleMode && (isCustomFormatSelected || outFormatLocked) && (
                <Button variant="outline" size="icon-xs" className={cn(outFormatLocked && 'text-primary')} title={t('Lock/unlock output format')} onClick={toggleOutFormatLocked}>
                    <FormatLockIcon />
                </Button>
            )}

            {filePath && <Button_ExportMode className="h-6 w-36 text-xs" />}
        </div>
    </>);
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
