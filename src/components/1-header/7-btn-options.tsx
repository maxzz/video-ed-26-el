import { useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { settingsVisibleAtom } from "@/editor/1-layout/9-state/panels-atoms";
import { Button } from "@/ui/shadcn/button";
import { IconSliders } from "@/ui/icons/normal";

/** Opens the editor Settings (which also include the template application options) */
export function ButtonOptions() {
    const { t } = useTranslation();
    const setSettingsVisible = useSetAtom(settingsVisibleAtom);

    return (
        <Button
            className="size-6 rounded"
            variant="ghost"
            size="icon"
            onClick={() => setSettingsVisible(true)}
            title={t("Settings")}
            type="button"
        >
            <IconSliders className="size-3.5" />
        </Button>
    );
}
