import i18n from 'i18next';
import { ArrowRightIcon } from 'lucide-react';
import { openCustomDialog } from '../7-0-dialogs/dialogs.ts';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/ui/shadcn/dialog';
import { Button } from '@/ui/shadcn/button';

export type OpenFileResponse = 'open' | 'project' | 'tracks' | 'subtitles' | 'addToBatch' | 'mergeWithCurrentFile';

export async function askForFileOpenAction(inputOptions: [OpenFileResponse, string][]) {
    return openCustomDialog<OpenFileResponse>((close) => (
        <DialogContent className="max-w-md" noClose>
            <DialogHeader>
                <DialogTitle className="text-sm">{i18n.t('You opened a new file. What do you want to do?')}</DialogTitle>
                <DialogDescription className="sr-only">{i18n.t('You opened a new file. What do you want to do?')}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-stretch gap-1">
                {inputOptions.map(([key, text]) => (
                    <Button key={key} variant="ghost" className="justify-start" onClick={() => close(key)}>
                        <ArrowRightIcon className="text-muted-foreground" /> {text}
                    </Button>
                ))}
                <Button variant="ghost" className="justify-start" onClick={() => close(undefined)}>
                    <ArrowRightIcon className="text-destructive" /> {i18n.t('Cancel')}
                </Button>
            </div>
        </DialogContent>
    ));
}
