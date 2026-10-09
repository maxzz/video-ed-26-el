import { useSnapshot } from "valtio";
import { Button } from "@/ui/shadcn/button";
import { Switch } from "@/ui/shadcn/switch";
import { CogIcon, KeyboardIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { userSettings } from "@/editor/0-core/9-state/user-settings";
import { type ModifierKey } from "@shared/types";
import { tmcmd_help_toggleKeyboardShortcuts } from "@/components/2-main/0-all/a-panels-atoms";
import { getModifierKeyNames } from "@/editor/c-keyboard/8-lib/actions-map";
import { requestTuner } from "../../7-actions/8-settings-actions";
import { SettingRow, SettingSelect } from "../2-settings-rows";

export function Section_Input() {
    const s = useSnapshot(userSettings);
    const { t } = useTranslation();
    const modifierKeyNames = getModifierKeyNames();

    return (<>
        <SettingRow label={t('Keyboard & mouse shortcuts')}>
            <Button variant="outline" size="sm" onClick={tmcmd_help_toggleKeyboardShortcuts}>
                <KeyboardIcon />
                {t('Keyboard & mouse shortcuts')}
            </Button>
        </SettingRow>

        <ModifierKeySetting text={t('Segment manipulation mouse modifier key')} value={s.segmentMouseModifierKey} names={modifierKeyNames} onChange={(v) => { userSettings.segmentMouseModifierKey = v; }} />
        <ModifierKeySetting text={t('Mouse wheel zoom modifier key')} value={s.mouseWheelZoomModifierKey} names={modifierKeyNames} onChange={(v) => { userSettings.mouseWheelZoomModifierKey = v; }} />
        <ModifierKeySetting text={t('Mouse wheel frame seek modifier key')} value={s.mouseWheelFrameSeekModifierKey} names={modifierKeyNames} onChange={(v) => { userSettings.mouseWheelFrameSeekModifierKey = v; }} />
        <ModifierKeySetting text={t('Mouse wheel keyframe seek modifier key')} value={s.mouseWheelKeyframeSeekModifierKey} names={modifierKeyNames} onChange={(v) => { userSettings.mouseWheelKeyframeSeekModifierKey = v; }} />

        <TunerSetting text={t('Timeline trackpad/wheel sensitivity')} onClick={() => requestTuner('wheelSensitivity')} />
        <TunerSetting text={t('Timeline keyboard seek interval')} onClick={() => requestTuner('keyboardNormalSeekSpeed')} />
        <TunerSetting text={t('Timeline keyboard seek interval (longer)')} onClick={() => requestTuner('keyboardSeekSpeed2')} />
        <TunerSetting text={t('Timeline keyboard seek interval (longest)')} onClick={() => requestTuner('keyboardSeekSpeed3')} />
        <TunerSetting text={t('Timeline keyboard seek acceleration')} onClick={() => requestTuner('keyboardSeekAccFactor')} />

        <SettingRow label={t('Invert timeline trackpad/wheel direction?')}>
            <Switch checked={s.invertTimelineScroll ?? false} onCheckedChange={(v) => { userSettings.invertTimelineScroll = v; }} />
        </SettingRow>
    </>);
}

function ModifierKeySetting({ text, value, names, onChange }: { text: string; value: ModifierKey; names: Record<ModifierKey, string>; onChange: (v: ModifierKey) => void; }) {
    return (
        <SettingRow label={text}>
            <SettingSelect<ModifierKey> value={value} options={names} onChange={onChange} />
        </SettingRow>
    );
}

function TunerSetting({ text, onClick }: { text: string; onClick: () => void; }) {
    const { t } = useTranslation();
    return (
        <SettingRow label={text}>
            <Button variant="outline" size="sm" onClick={onClick}>
                <CogIcon />
                {t('Change value')}
            </Button>
        </SettingRow>
    );
}
