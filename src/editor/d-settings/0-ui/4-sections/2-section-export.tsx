import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { Button } from "@/ui/shadcn/button";
import { Switch } from "@/ui/shadcn/switch";
import { BanIcon, BrushCleaningIcon, ContrastIcon, FileOutputIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { userSettings } from "@/editor/0-core/9-state/user-settings";
import { showAdvancedSettingsAtom } from "@/components/2-main/0-all/a-panels-atoms";
import { askForCleanupChoices } from "@/editor/7-export/7-actions/export-actions";
import { SettingRow, SettingSelect } from "../2-settings-rows";
import { DropdownMenu_OutDirSelector } from "../3-menu-out-dir-selector";

export function Section_ExportOptions() {
    const s = useSnapshot(userSettings);
    const showAdvancedSettings = useAtomValue(showAdvancedSettingsAtom);
    const { t } = useTranslation();

    return (<>
        <SettingRow
            label={t('Choose cutting mode: Remove or keep selected segments from video when exporting?')}
            details={s.invertCutSegments
                ? <><b>{t('Remove')}</b>: {t('The video inside segments will be discarded, while the video surrounding them will be kept.')}</>
                : <><b>{t('Keep')}</b>: {t('The video inside segments will be kept, while the video outside will be discarded.')}</>}
        >
            <Button variant="outline" size="sm" onClick={() => { userSettings.invertCutSegments = !userSettings.invertCutSegments; }}>
                <ContrastIcon className={s.invertCutSegments ? 'text-destructive' : undefined} />
                {s.invertCutSegments ? t('Remove') : t('Keep')}
            </Button>
        </SettingRow>

        <SettingRow label={t('Working directory')} details={t('This is where working files and exported files are stored.')}>
            <DropdownMenu_OutDirSelector />
        </SettingRow>

        {showAdvancedSettings && (<>
            <SettingRow label={t('Set file modification date/time of output files to:')}>
                <SettingSelect
                    value={typeof s.treatOutputFileModifiedTimeAsStart === 'boolean' ? String(s.treatOutputFileModifiedTimeAsStart) : 'disabled'}
                    options={{
                        disabled: t('Current time'),
                        true: t('Source file\'s time plus segment start cut time'),
                        false: t('Source file\'s time minus segment end cut time'),
                    }}
                    onChange={(v) => { userSettings.treatOutputFileModifiedTimeAsStart = v === 'disabled' ? null : v === 'true'; }}
                />
            </SettingRow>

            <SettingRow label={t('Treat source file modification date/time as:')}>
                <SettingSelect
                    disabled={s.treatOutputFileModifiedTimeAsStart == null}
                    value={String(s.treatInputFileModifiedTimeAsStart)}
                    options={{ true: t('Start of video'), false: t('End of video') }}
                    onChange={(v) => { userSettings.treatInputFileModifiedTimeAsStart = v === 'true'; }}
                />
            </SettingRow>
        </>)}

        <SettingRow
            label={t('Keyframe cut mode')}
            details={s.keyframeCut
                ? <><b>{t('Keyframe cut')}</b>: {t('Cut at the preceding keyframe (not accurate time.) Equiv to')}: <code className="px-1 font-mono bg-muted rounded">ffmpeg -ss N -i input.mp4</code></>
                : <><b>{t('Normal cut')}</b>: {t('Accurate time but could leave an empty portion at the beginning of the video. Equiv to')}: <code className="px-1 font-mono bg-muted rounded">ffmpeg -i input -ss N</code></>}
        >
            <Switch checked={s.keyframeCut} onCheckedChange={(v) => { userSettings.keyframeCut = v; }} />
        </SettingRow>

        <SettingRow label={t('Cleanup files after export?')}>
            <Button variant="outline" size="sm" onClick={askForCleanupChoices}>
                <BrushCleaningIcon />
                {t('Change preferences')}
            </Button>
        </SettingRow>

        {showAdvancedSettings && (
            <SettingRow
                label={t('Extract unprocessable tracks to separate files or discard them?')}
                details={t('(data tracks such as GoPro GPS, telemetry etc. are not copied over by default because ffmpeg cannot cut them, thus they will cause the media duration to stay the same after cutting video/audio)')}
            >
                <Button variant="outline" size="sm" onClick={() => { userSettings.autoExportExtraStreams = !userSettings.autoExportExtraStreams; }}>
                    {s.autoExportExtraStreams ? <FileOutputIcon /> : <BanIcon className="text-destructive" />}
                    {s.autoExportExtraStreams ? t('Extract') : t('Discard')}
                </Button>
            </SettingRow>
        )}
    </>);
}
