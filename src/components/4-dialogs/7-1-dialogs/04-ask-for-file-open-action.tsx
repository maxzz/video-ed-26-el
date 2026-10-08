import i18n from "i18next";
import { Button } from "@/ui/shadcn/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { ArrowRightIcon } from "lucide-react";
import { open_CustomDialog } from "../7-0-dialogs/1-dialogs";

export type OpenFileResponse = 'open' | 'project' | 'tracks' | 'subtitles' | 'addToBatch' | 'mergeWithCurrentFile';

export async function askDialog_ForFileOpenAction(inputOptions: [OpenFileResponse, string][]) {
    return open_CustomDialog<OpenFileResponse>(
        (close) => (
            <DialogContent className="max-w-md" noClose>
                <DialogHeader>
                    <DialogTitle className="text-sm">
                        {i18n.t('You opened a new file. What do you want to do?')}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {i18n.t('You opened a new file. What do you want to do?')}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-stretch gap-1">
                    {inputOptions.map(
                        ([key, text]) => (
                            <Button key={key} variant="ghost" className="justify-start" onClick={() => close(key)}>
                                <ArrowRightIcon className="text-muted-foreground" /> {text}
                            </Button>
                        )
                    )}

                    <Button variant="ghost" className="justify-start" onClick={() => close(undefined)}>
                        <ArrowRightIcon className="text-destructive" />
                        {i18n.t('Cancel')}
                    </Button>
                </div>
            </DialogContent>
        )
    );
}
