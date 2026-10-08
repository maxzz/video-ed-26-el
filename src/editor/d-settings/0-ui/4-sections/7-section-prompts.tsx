import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { Switch } from "@/ui/shadcn/switch";
import { useTranslation } from "react-i18next";

import { userSettings } from "@/editor/0-core/9-state/user-settings";
import { type EnableImportChapters } from "@shared/types";
import { getEnableImportChaptersOptions } from "@/editor/0-core/8-lib/util";
import { showAdvancedSettingsAtom } from "@/components/2-main/0-all/a-panels-atoms";
import { SettingRow, SettingSelect } from "../2-settings-rows";

export function Section_Prompts() {
    const s = useSnapshot(userSettings);
    const showAdvancedSettings = useAtomValue(showAdvancedSettingsAtom);
    const { t } = useTranslation();

    return (<>
        <SettingRow label={t('Show notifications')}>
            <Switch checked={!s.hideOsNotifications} onCheckedChange={(v) => { userSettings.hideOsNotifications = v ? undefined : 'all'; }} />
        </SettingRow>

        <SettingRow label={t('Show informational in-app notifications')}>
            <Switch checked={!s.hideNotifications} onCheckedChange={(v) => { userSettings.hideNotifications = v ? undefined : 'all'; }} />
        </SettingRow>

        <SettingRow label={t('Ask for confirmation when closing app or file?')}>
            <Switch checked={s.askBeforeClose} onCheckedChange={(v) => { userSettings.askBeforeClose = v; }} />
        </SettingRow>

        {showAdvancedSettings && (<>
            <SettingRow label={t('Ask about what to do when opening a new file when another file is already already open?')}>
                <Switch checked={s.enableAskForFileOpenAction} onCheckedChange={(v) => { userSettings.enableAskForFileOpenAction = v; }} />
            </SettingRow>

            <SettingRow label={t('Import chapters to segments when opening file')}>
                <SettingSelect<EnableImportChapters>
                    value={s.enableImportChapters}
                    options={getEnableImportChaptersOptions()}
                    onChange={(v) => { userSettings.enableImportChapters = v; }}
                />
            </SettingRow>
        </>)}
    </>);
}
