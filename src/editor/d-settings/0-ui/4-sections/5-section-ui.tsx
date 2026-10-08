import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { Button } from "@/ui/shadcn/button";
import { Switch } from "@/ui/shadcn/switch";
import { Slider } from "@/ui/shadcn/slider";
import { RotateCcwIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { userSettings } from "@/editor/0-core/9-state/user-settings";
import { defaultConfig } from "@shared/default-config";
import { type Config, type TimecodeFormat } from "@shared/types";
import { showAdvancedSettingsAtom } from "@/components/2-main/0-all/a-panels-atoms";
import { SettingRow, SettingSelect } from "../2-settings-rows";

export function Section_UserInterface() {
    const s = useSnapshot(userSettings);
    const showAdvancedSettings = useAtomValue(showAdvancedSettingsAtom);
    const { t } = useTranslation();

    const timecodeFormatOptions: Record<TimecodeFormat, string> = {
        frameCount: t('Frame counts'),
        seconds: t('Total seconds'),
        timecodeWithDecimalFraction: t('Millisecond fractions'),
        timecodeWithFramesFraction: t('Frame fractions'),
    };

    return (<>
        {showAdvancedSettings && (<>
            <SettingRow label={t('Remember window size and position')}>
                <Switch checked={s.storeWindowBounds} onCheckedChange={(v) => { userSettings.storeWindowBounds = v; }} />
            </SettingRow>

            <SettingRow label={t('Waveform height')}>
                <Slider
                    className="w-48"
                    min={20}
                    max={1000}
                    value={[s.waveformHeight]}
                    onValueChange={([v]) => { userSettings.waveformHeight = v ?? defaultConfig.waveformHeight; }}
                />
                <span className="w-9 text-right tabular-nums">{s.waveformHeight}</span>
                <Button variant="ghost" size="icon-sm" title={t('Default')} onClick={() => { userSettings.waveformHeight = defaultConfig.waveformHeight; }}>
                    <RotateCcwIcon />
                </Button>
            </SettingRow>

            <SettingRow label={t('Auto load timecode from file as an offset in the timeline?')}>
                <Switch checked={s.autoLoadTimecode} onCheckedChange={(v) => { userSettings.autoLoadTimecode = v; }} />
            </SettingRow>

            <SettingRow label={t('Try to automatically convert to supported format when opening unsupported file?')}>
                <Switch checked={s.enableAutoHtml5ify} onCheckedChange={(v) => { userSettings.enableAutoHtml5ify = v; }} />
            </SettingRow>
        </>)}

        <SettingRow label={t('Prefer strong colors')}>
            <Switch checked={s.preferStrongColors} onCheckedChange={(v) => { userSettings.preferStrongColors = v; }} />
        </SettingRow>

        <SettingRow label={t('Reduce motion in user interface')}>
            <SettingSelect<Config['reducedMotion']>
                value={s.reducedMotion}
                options={{ user: t('System default'), always: t('Yes'), never: t('No') }}
                onChange={(v) => { userSettings.reducedMotion = v; }}
            />
        </SettingRow>

        <SettingRow label={t('In timecode show')}>
            <SettingSelect<TimecodeFormat>
                value={s.timecodeFormat}
                options={timecodeFormatOptions}
                onChange={(v) => { userSettings.timecodeFormat = v; }}
            />
        </SettingRow>
    </>);
}
