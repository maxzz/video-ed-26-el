import { useAtomValue } from 'jotai';
import { TriangleAlertIcon } from 'lucide-react';
import { Button } from '@/ui/shadcn/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/shadcn/dialog';
import { useTranslation } from 'react-i18next';
import { jotaiDefaultStore } from '@/utils/local-utils/9-jotai-default-store';

import { genericErrorAtom } from '@/editor/0-core/9-state/working.ts';

const closeErrorDialog = (open: boolean) => {
    if (!open) jotaiDefaultStore.set(genericErrorAtom, undefined);
};

/** Port of upstream ErrorDialog: errors from anywhere in the app, also while other dialogs are open or from keyboard actions */
export function Dialog_ShowError() {
    const { t } = useTranslation();
    const error = useAtomValue(genericErrorAtom);

    return (
        <Dialog open={error != null} onOpenChange={closeErrorDialog}>

            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <TriangleAlertIcon className="shrink-0 size-4 text-amber-500" />
                        {error?.title ?? t('Error')}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {t('An error has occurred.')}
                    </DialogDescription>
                </DialogHeader>

                {error != null && (
                    <div className="whitespace-pre-wrap select-text max-h-[50vh] text-xs overflow-auto">
                        {error.err instanceof Error ? error.err.message : String(error.err)}
                    </div>
                )}

                <DialogFooter>
                    <DialogClose asChild>
                        <Button>
                            {t('OK')}
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
