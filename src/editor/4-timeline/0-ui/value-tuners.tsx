import { atom, useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { type Config } from "@shared/types";
import { Button } from "@/ui/shadcn/button";
import { Slider } from "@/ui/shadcn/slider";
import { Switch } from "@/ui/shadcn/switch";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { userSettings, userSettingsAtom } from "@/editor/0-core/9-state/user-settings";
import { tunerVisibleAtom } from "@/components/2-main/0-all/a-panels-atoms";

// Port of upstream ValueTuners.tsx + ValueTuner.tsx

type TunerKey = 'wheelSensitivity' | 'waveformHeight' | 'keyboardNormalSeekSpeed' | 'keyboardSeekSpeed2' | 'keyboardSeekSpeed3' | 'keyboardSeekAccFactor';

interface TunerDef {
    title: string;
    min: number;
    max: number;
    resolution: number;
    decimals: number;
    default: number;
}

// NOTE default values are duplicated in shared/default-config.ts
const getTunerDefs = (t: (key: string) => string): Record<TunerKey, TunerDef> => ({
    wheelSensitivity: { title: t('Timeline trackpad/wheel sensitivity'), min: 0, max: 4, resolution: 1000, decimals: 4, default: 0.2 },
    waveformHeight: { title: t('Waveform height'), min: 20, max: 1000, resolution: 1000 - 20, decimals: 0, default: 40 },
    keyboardNormalSeekSpeed: { title: t('Timeline keyboard seek interval'), min: 0, max: 120, resolution: 1000, decimals: 4, default: 1 },
    keyboardSeekSpeed2: { title: t('Timeline keyboard seek interval (longer)'), min: 0, max: 600, resolution: 1000, decimals: 4, default: 10 },
    keyboardSeekSpeed3: { title: t('Timeline keyboard seek interval (longest)'), min: 0, max: 3600, resolution: 1000, decimals: 4, default: 60 },
    keyboardSeekAccFactor: { title: t('Timeline keyboard seek acceleration'), min: 1, max: 2, resolution: 1000, decimals: 4, default: 1.03 },
});

/** "Precise" mode narrows the slider range around the current value */
const tunerZoomAtom = atom<{ min: number; max: number; } | undefined>(undefined);

function closeTuner() {
    jotaiDefaultStore.set(tunerVisibleAtom, undefined);
    jotaiDefaultStore.set(tunerZoomAtom, undefined);
}

function setValue(key: TunerKey, value: number) {
    (userSettings as Pick<Config, TunerKey>)[key] = value;
}

export function ValueTuners() {
    const type = useAtomValue(tunerVisibleAtom) as TunerKey | undefined;
    if (type == null) return null;
    return <ValueTuner type={type} />;
}

function ValueTuner({ type }: { type: TunerKey; }) {
    const { t } = useTranslation();
    const settings = useAtomValue(userSettingsAtom);
    const tunerZoom = useAtomValue(tunerZoomAtom);

    const def = getTunerDefs(t)[type];
    const value = settings[type];
    const min = tunerZoom?.min ?? def.min;
    const max = tunerZoom?.max ?? def.max;
    const { resolution, decimals } = def;

    function onChange(sliderValue: number) {
        setValue(type, Math.min(Math.max(min, ((sliderValue / resolution) * (max - min)) + min), max));
    }

    function toggleZoom() {
        if (tunerZoom != null) {
            jotaiDefaultStore.set(tunerZoomAtom, undefined);
        } else {
            const zoomWindow = (def.max - def.min) / 100;
            jotaiDefaultStore.set(tunerZoomAtom, { min: Math.max(def.min, value - zoomWindow), max: Math.min(def.max, value + zoomWindow) });
        }
    }

    function resetToDefault() {
        setValue(type, def.default);
        jotaiDefaultStore.set(tunerZoomAtom, undefined);
    }

    return (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 m-4 p-5 min-w-80 text-foreground bg-background/70 backdrop-blur-md rounded-2xl shadow-lg z-50">
            <div className="basis-100 mb-1 flex items-center">
                <div>{def.title}</div>
                <div className="ml-2.5 mr-2 w-[5.5em] text-lg font-mono">{value.toFixed(decimals)}</div>
                <Switch className="shrink-0" checked={tunerZoom != null} onCheckedChange={toggleZoom} />
                <span className="ml-1">{t('Precise')}</span>
            </div>

            <Slider
                className="mb-2"
                min={0}
                max={resolution}
                step={1}
                value={[((value - min) / (max - min)) * resolution]}
                onValueChange={([v]) => { if (v != null) onChange(v); }}
            />

            <div className="flex items-center justify-end gap-1">
                <Button variant="outline" onClick={resetToDefault}>{t('Default')}</Button>
                <Button onClick={closeTuner}>{t('Done')}</Button>
            </div>
        </div>
    );
}
