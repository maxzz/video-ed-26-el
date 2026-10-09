import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { NotebookTextIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { cn } from "@/utils";
import { userSettingsAtom } from "@/editor/0-core/9-state/user-settings";
import { toggleExportConfirmEnabled } from "@/editor/0-core/7-actions/settings-toggles";

/** Toggles the export options screen. Moved here from the playback bar. */
export function ButtonExportConfirm() {
    const { exportConfirmEnabled } = useAtomValue(userSettingsAtom);
    const { t } = useTranslation();

    return (<>
        {!exportConfirmEnabled && (
            <span title={t("Export options screen is disabled, and you will not see any important notices or warnings.")}>
                <TriangleAlertIcon className="size-3.5 text-destructive" />
            </span>
        )}

        <Button
            className={cn("size-6", exportConfirmEnabled ? "text-primary" : "text-muted-foreground", "rounded")}
            variant="ghost"
            size="icon"
            onClick={toggleExportConfirmEnabled}
            title={t("Show export options screen before exporting?")}
            type="button"
        >
            <NotebookTextIcon className="size-3.5" />
        </Button>
    </>);
}
