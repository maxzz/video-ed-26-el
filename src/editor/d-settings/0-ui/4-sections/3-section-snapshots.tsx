import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { Slider } from "@/ui/shadcn/slider";
import { useTranslation } from "react-i18next";

import { userSettings } from "@/editor/0-core/9-state/user-settings";
import { type CaptureFormat, type Config } from "@shared/types";
import { showAdvancedSettingsAtom } from "@/components/2-main/0-all/a-panels-atoms";
import { SettingRow, SettingSelect } from "../2-settings-rows";

export function Section_Snapshots() {
    const s = useSnapshot(userSettings);
    const showAdvancedSettings = useAtomValue(showAdvancedSettingsAtom);
    const { t } = useTranslation();

    return (<>
        <SettingRow label={t('Snapshot capture format')}>
            <SettingSelect<CaptureFormat>
                value={s.captureFormat}
                options={{ jpeg: 'JPEG', png: 'PNG', webp: 'WEBP' }}
                onChange={(v) => { userSettings.captureFormat = v; }}
            />
        </SettingRow>

        {showAdvancedSettings && (
            <SettingRow
                label={t('Snapshot capture method')}
                details={t('FFmpeg capture method might sometimes capture more correct colors, but the captured snapshot might be off by one or more frames, relative to the preview.')}
            >
                <SettingSelect<Config['captureFrameMethod']>
                    value={s.captureFrameMethod}
                    options={{ videotag: t('HTML video tag'), ffmpeg: t('FFmpeg') }}
                    onChange={(v) => { userSettings.captureFrameMethod = v; }}
                />
            </SettingRow>
        )}

        <SettingRow label={t('Snapshot capture quality')}>
            <Slider
                className="w-48"
                min={1}
                max={1000}
                value={[Math.round(s.captureFrameQuality * 1000)]}
                onValueChange={([v]) => { userSettings.captureFrameQuality = Math.max(Math.min(1, (v ?? 1000) / 1000), 0); }}
            />
            <span className="w-9 text-right tabular-nums">{Math.round(s.captureFrameQuality * 100)}%</span>
        </SettingRow>

        {showAdvancedSettings && (
            <SettingRow
                label={t('File names of extracted video frames')}
                details={t('Note that this only applies when extracting multiple frames. When "Frame number" is selected, frame numbers are relative to the start of the segment (starting from 1).')}
            >
                <SettingSelect<Config['captureFrameFileNameFormat']>
                    value={s.captureFrameFileNameFormat}
                    options={{ timestamp: t('Frame timestamp'), index: t('Frame number') }}
                    onChange={(v) => { userSettings.captureFrameFileNameFormat = v; }}
                />
            </SettingRow>
        )}
    </>);
}
