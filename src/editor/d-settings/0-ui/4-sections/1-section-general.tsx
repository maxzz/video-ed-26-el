import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { Button } from "@/ui/shadcn/button";
import { Switch } from "@/ui/shadcn/switch";
import { CogIcon, FileIcon, FolderIcon, GlobeIcon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { userSettings } from "@/editor/0-core/9-state/user-settings";
import { type SupportedLanguage, langNames } from "@shared/i18n";
import { isStoreBuild } from "@/editor/0-core/8-lib/util";
import { showAdvancedSettingsAtom } from "@/components/2-main/0-all/a-panels-atoms";
import { changeCustomFfPath, clearCustomFfPath, setLanguage, setShowAdvancedSettings, toggleExportConfirmEnabled, toggleStoreProjectInWorkingDir } from "../../7-actions/8-settings-actions";
import { SettingRow, SettingSelect } from "../2-settings-rows";

export function Section_General() {
    const s = useSnapshot(userSettings);
    const showAdvancedSettings = useAtomValue(showAdvancedSettingsAtom);
    const { t } = useTranslation();

    const languageOptions: [string, string][] = [['system', t('System language')], ...Object.entries(langNames)];

    return (<>
        <SettingRow label={<span className="flex items-center gap-1.5"><GlobeIcon className="size-3.5" /> App language</span>}>
            <SettingSelect
                value={s.language ?? 'system'}
                options={languageOptions}
                onChange={(value) => setLanguage(value === 'system' ? null : value as SupportedLanguage)}
            />
        </SettingRow>

        <SettingRow
            label={t('Show advanced settings')}
            details={!showAdvancedSettings && t('Advanced settings are currently not visible.')}
        >
            <Switch checked={showAdvancedSettings} onCheckedChange={setShowAdvancedSettings} />
        </SettingRow>

        <SettingRow
            label={t('Show export options screen before exporting?')}
            details={t('This gives you an overview of the export and allows you to customise more parameters before exporting, like changing the output file name.')}
        >
            <Switch checked={s.exportConfirmEnabled} onCheckedChange={toggleExportConfirmEnabled} />
        </SettingRow>

        {showAdvancedSettings && (<>
            <SettingRow label={t('Auto save project file?')}>
                <Switch checked={s.autoSaveProjectFile} onCheckedChange={(v) => { userSettings.autoSaveProjectFile = v; }} />
            </SettingRow>

            <SettingRow label={t('Store project file (.llc) in the working directory or next to loaded media file?')}>
                <Button variant="outline" size="sm" disabled={!s.autoSaveProjectFile} onClick={toggleStoreProjectInWorkingDir}>
                    {s.storeProjectInWorkingDir ? <FolderIcon /> : <FileIcon />}
                    {s.storeProjectInWorkingDir ? t('Store in working directory') : t('Store next to media file')}
                </Button>
            </SettingRow>

            <SettingRow
                label={t('Custom FFmpeg directory (experimental)')}
                details={t('This allows you to specify custom FFmpeg and FFprobe binaries to use. Make sure the "ffmpeg" and "ffprobe" executables exist in the same directory, and then select the directory.')}
            >
                {s.customFfPath && <span className="max-w-60 truncate" title={s.customFfPath}>{s.customFfPath}</span>}
                <Button variant="outline" size="sm" onClick={changeCustomFfPath}>
                    <CogIcon />
                    {s.customFfPath ? t('Using external ffmpeg') : t('Using built-in ffmpeg')}
                </Button>
                {s.customFfPath && (
                    <Button variant="ghost" size="icon-sm" title={t('Clear')} onClick={clearCustomFfPath}>
                        <XIcon />
                    </Button>
                )}
            </SettingRow>

            {!isStoreBuild && (
                <SettingRow label={t('Check for updates on startup?')}>
                    <Switch checked={s.enableUpdateCheck} onCheckedChange={(v) => { userSettings.enableUpdateCheck = v; }} />
                </SettingRow>
            )}

            <SettingRow label={t('Allow multiple instances of LosslessCut to run concurrently? (experimental)')}>
                <Switch checked={s.allowMultipleInstances} onCheckedChange={(v) => { userSettings.allowMultipleInstances = v; }} />
            </SettingRow>
        </>)}
    </>);
}
