import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { lastCommandsVisibleAtom, toggleLastCommands } from '@/editor/1-layout/9-state/panels-atoms.ts';
import { ffmpegCommandLogAtom } from '@/editor/2-file/9-state/file-atoms.ts';
import { Button } from '@/ui/shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/ui/shadcn/dialog';
import { CopyClipboardButton } from './controls.tsx';

// Port of upstream LastCommands.tsx

export function LastCommands() {
    const { t } = useTranslation();
    const visible = useAtomValue(lastCommandsVisibleAtom);
    const ffmpegCommandLog = useAtomValue(ffmpegCommandLogAtom);

    const sorted = [...ffmpegCommandLog].sort((a, b) => b.time.getTime() - a.time.getTime());

    return (
        <Dialog open={visible} onOpenChange={toggleLastCommands}>
            <DialogContent className="max-h-[85vh] sm:max-w-[90vw] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t('Last ffmpeg commands')}</DialogTitle>
                    <DialogDescription>{t('The last executed ffmpeg commands will show up here after you run operations. You can copy them to clipboard and modify them to your needs before running on your command line.')}</DialogDescription>
                </DialogHeader>

                {sorted.length > 0 && (
                    <div className="min-h-0 flex flex-col gap-2">
                        <div>
                            <Button variant="outline" size="sm" onClick={() => appStore.set(ffmpegCommandLogAtom, [])}>{t('Clear')}</Button>
                        </div>

                        <div className="min-h-0 overflow-auto">
                            {sorted.map(({ command, time }, i) => (
                                <div key={i} className="whitespace-pre py-1 text-xs font-mono flex items-center gap-2">
                                    <CopyClipboardButton text={command} />
                                    <span className="opacity-50">{time.toLocaleTimeString()}</span>
                                    {command}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
