import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { CameraIcon } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { runAction } from "@/editor/0-core/7-actions/kbd-actions";
import { hasVideoAtom } from "@/editor/2-file/9-state/a-file-atoms";
import { actionTitleAtom } from "@/editor/4-timeline/9-state/action-title";
import { simpleModeAtom } from "@/editor/5-segments/9-state/a-seg-ui-atoms";
import { Button_CaptureFormat } from "@/editor/a-capture-frame/0-ui/btn-capture-format";

/** Capture-frame controls, shown in the header beside Export. */
export function HeaderCapture() {
    const hasVideo = useAtomValue(hasVideoAtom);
    const simpleMode = useAtomValue(simpleModeAtom);
    const actionTitle = useAtomValue(actionTitleAtom);
    const { t } = useTranslation();

    if (!hasVideo) {
        return null;
    }

    return (
        <div className="flex items-center gap-0.5">
            <Button
                className="size-6 rounded"
                variant="ghost"
                size="icon"
                title={actionTitle(t("Capture frame"), "captureSnapshot")}
                onClick={() => runAction("captureSnapshot")}
                type="button"
            >
                <CameraIcon className="size-3.5" />
            </Button>

            {!simpleMode && (
                <Button_CaptureFormat className="px-1.5 h-6 w-auto text-xs" size="xs" variant="outline" />
            )}
        </div>
    );
}
