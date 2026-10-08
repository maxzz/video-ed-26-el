import { type ComponentProps } from "react";
import { useSnapshot } from "valtio";
import { ImageIcon } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { userSettings } from "@/editor/0-core/9-state/user-settings";
import { withBlur } from "@/editor/0-core/8-lib/util";

import { useTranslation } from "react-i18next";
import { toggleCaptureFormat } from "../7-actions/capture-actions";

/** Port of upstream CaptureFormatButton: cycles jpeg/png/webp */
export function Button_CaptureFormat({ showIcon = false, ...rest }: { showIcon?: boolean; } & ComponentProps<typeof Button>) {
    const { captureFormat } = useSnapshot(userSettings);
    const { t } = useTranslation();
    return (
        <Button variant="ghost" size="sm" title={t('Capture frame format')} onClick={withBlur(toggleCaptureFormat)} {...rest}>
            {showIcon && <ImageIcon />}
            {captureFormat.toUpperCase()}
        </Button>
    );
}
