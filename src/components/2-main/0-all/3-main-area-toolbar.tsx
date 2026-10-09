import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { MoonIcon, PanelRightIcon, SettingsIcon, SunIcon } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { userSettingsAtom } from "@/editor/0-core/9-state/user-settings";
import { runAction } from "@/editor/0-core/7-actions/kbd-actions";
import { settingsVisibleAtom } from "@/components/2-main/0-all/a-panels-atoms";

export function MainArea_Toolbar() {
    const { t } = useTranslation();
    const { simpleMode, darkMode } = useAtomValue(userSettingsAtom);

    const DarkModeIcon = darkMode ? SunIcon : MoonIcon;

    return (
        <div className="px-1.5 py-1 min-h-9 text-xs bg-muted/40 border-b flex items-center justify-end gap-1.5">
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
