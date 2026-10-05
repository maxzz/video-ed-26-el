import { useTranslation } from 'react-i18next';
import { FileTextIcon, GitCompareIcon } from 'lucide-react';
import { appName } from '@shared/constants.ts';
import { openCustomDialog } from '@/components/4-dialogs/7-0-dialogs/dialogs.ts';
import { mainApi } from '@/editor/0-core/8-lib/main-api.ts';
import { Button } from '@/ui/shadcn/button';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/shadcn/dialog';
import { getAppCompareReleasesUrl, getAppReleaseUrl } from '../8-lib/versions.ts';

/** Port of upstream WhatsNew.tsx. We have no bundled release highlights, so it links to the release notes */
export async function openWhatsNewDialog({ fromVersion, toVersion }: { fromVersion: string; toVersion: string; }) {
    await openCustomDialog<void>((close) => <WhatsNewDialogContent fromVersion={fromVersion} toVersion={toVersion} close={close} />);
}

function WhatsNewDialogContent({ fromVersion, toVersion, close }: { fromVersion: string; toVersion: string; close: () => void; }) {
    const { t } = useTranslation();
    return (
        <DialogContent className="max-w-lg">
            <DialogHeader>
                <DialogTitle>{appName} v{toVersion}</DialogTitle>
                <DialogDescription className="text-xs">v{fromVersion} → v{toVersion}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => mainApi.openExternal(getAppReleaseUrl(toVersion))}>
                    <FileTextIcon /> {t('All release notes')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => mainApi.openExternal(getAppCompareReleasesUrl(fromVersion, toVersion))}>
                    <GitCompareIcon /> {t('All code changes')}
                </Button>
            </div>

            <DialogFooter>
                <Button onClick={() => close()}>{t('OK')}</Button>
            </DialogFooter>
        </DialogContent>
    );
}
