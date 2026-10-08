import { useSnapshot } from "valtio";
import { Switch } from "@/ui/shadcn/switch";
import { useTranslation } from "react-i18next";

import { userSettings } from "@/editor/0-core/9-state/user-settings";
import { SettingRow } from "../2-settings-rows";

export function Section_Other() {
    const s = useSnapshot(userSettings);
    const { t } = useTranslation();

    return (<>
        <SettingRow label={t('Enable HEVC / H265 hardware decoding (you may need to turn this off if you have problems with HEVC files)')}>
            <Switch checked={s.enableNativeHevc} onCheckedChange={(v) => { userSettings.enableNativeHevc = v; }} />
        </SettingRow>

        <SettingRow label={t('Enable FFmpeg `-hwaccel auto` flag. This can improve performance segment auto detection and FFmpeg-assisted playback speed.')}>
            <Switch checked={s.ffmpegHwaccel === 'auto'} onCheckedChange={(v) => { userSettings.ffmpegHwaccel = v ? 'auto' : 'none'; }} />
        </SettingRow>
    </>);
}
