import { useTranslation } from "react-i18next";
import { PanelRightIcon } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { runAction } from "@/editor/0-core/7-actions/kbd-actions";

export function ButtonSegments() {
    const { t } = useTranslation();

    return (
        <Button
            className="size-6 rounded"
            variant="ghost"
            size="icon"
            onClick={() => runAction("toggleSegmentsList")}
            title={t("Segments")}
            type="button"
        >
            <PanelRightIcon className="size-3.5" />
        </Button>
    );
}
