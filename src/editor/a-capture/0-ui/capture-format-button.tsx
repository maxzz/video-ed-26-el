import type { ComponentProps } from 'react';
import { useSnapshot } from 'valtio';
import { useTranslation } from 'react-i18next';
import { ImageIcon } from 'lucide-react';
import { Button } from '@/ui/shadcn/button';
import { userSettings } from '@/editor/0-core/9-state/user-settings.ts';
import { withBlur } from '@/editor/0-core/8-lib/util.ts';
import { toggleCaptureFormat } from '../7-actions/capture-actions.ts';

/** Port of upstream CaptureFormatButton: cycles jpeg/png/webp */
export function CaptureFormatButton({ showIcon = false, ...rest }: { showIcon?: boolean; } & ComponentProps<typeof Button>) {
    const { t } = useTranslation();
    const { captureFormat } = useSnapshot(userSettings);
    return (
        <Button variant="ghost" size="sm" title={t('Capture frame format')} onClick={withBlur(toggleCaptureFormat)} {...rest}>
            {showIcon && <ImageIcon />}
            {captureFormat.toUpperCase()}
        </Button>
    );
}
