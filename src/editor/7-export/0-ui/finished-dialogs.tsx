import type { FormEvent, ReactNode } from 'react';
import { proxy, useSnapshot } from 'valtio';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';
import { CircleCheckIcon, InfoIcon } from 'lucide-react';
import { openCustomDialog } from '@/editor/0-core/9-state/dialogs.ts';
import { showItemInFolder } from '@/editor/0-core/8-lib/util.ts';
import { type CleanupChoice, type CleanupChoicesType, ListItem, Notices, OutputIncorrectSeeHelpMenu, UnorderedList, Warnings } from '@/editor/0-core/8-lib/app-dialogs.tsx';
import { Button } from '@/ui/shadcn/button';
import { Checkbox } from '@/ui/shadcn/checkbox';
import { Input } from '@/ui/shadcn/input';
import { Label } from '@/ui/shadcn/label';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/shadcn/dialog';
import { cn } from '@/utils/classnames';

// Port of the dialogs of upstream components/GenericDialog.tsx useDialog()

export async function openExportFinishedDialog({ filePath, children, className }: { filePath: string; children: ReactNode; className?: string; }) {
    const response = await openCustomDialog<boolean>((close) => (
        <DialogContent className={cn('sm:max-w-xl', className)}>
            <DialogHeader>
                <DialogTitle>{i18n.t('Success!')}</DialogTitle>
                <DialogDescription className="sr-only">{i18n.t('Success!')}</DialogDescription>
            </DialogHeader>

            <div className="text-sm">{children}</div>

            <DialogFooter>
                <Button variant="outline" onClick={() => close(false)}>{i18n.t('Close')}</Button>
                <Button autoFocus onClick={() => close(true)}>{i18n.t('Show')}</Button>
            </DialogFooter>
        </DialogContent>
    ));

    if (response) showItemInFolder(filePath);
}

function FinishedList({ title, hasWarnings, warnings, notices, testText }: { title: string; hasWarnings: boolean; warnings: string[]; notices: string[]; testText: string; }) {
    return (
        <UnorderedList>
            <ListItem icon={<CircleCheckIcon />} className={cn('font-bold', hasWarnings ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400')}>{title}</ListItem>
            <Warnings warnings={warnings} />
            <ListItem icon={<InfoIcon />}>{testText}</ListItem>
            <OutputIncorrectSeeHelpMenu />
            <Notices notices={notices} />
        </UnorderedList>
    );
}

export async function openCutFinishedDialog({ filePath, warnings, notices }: { filePath: string; warnings: string[]; notices: string[]; }) {
    const hasWarnings = warnings.length > 0;

    // https://github.com/mifi/lossless-cut/issues/2048
    await openExportFinishedDialog({
        filePath,
        className: 'sm:max-w-3xl',
        children: (
            <FinishedList
                hasWarnings={hasWarnings}
                title={hasWarnings ? i18n.t('Export finished with warning(s)', { count: warnings.length }) : i18n.t('Export is done!')}
                warnings={warnings}
                notices={notices}
                testText={i18n.t('Please test the output file in your desired player/editor before you delete the source file.')}
            />
        ),
    });
}

export async function openConcatFinishedDialog({ filePath, warnings, notices }: { filePath: string; warnings: string[]; notices: string[]; }) {
    const hasWarnings = warnings.length > 0;

    await openExportFinishedDialog({
        filePath,
        className: 'sm:max-w-3xl',
        children: (
            <FinishedList
                hasWarnings={hasWarnings}
                title={hasWarnings ? i18n.t('Files merged with warning(s)', { count: warnings.length }) : i18n.t('Files merged!')}
                warnings={warnings}
                notices={notices}
                testText={i18n.t('Please test the output files in your desired player/editor before you delete the source files.')}
            />
        ),
    });
}

// Cleanup choices

export async function openCleanupFilesDialog(cleanupChoicesInitial: CleanupChoicesType) {
    const choices = proxy<CleanupChoicesType>({ ...cleanupChoicesInitial });
    return openCustomDialog<CleanupChoicesType>((close) => <CleanupFilesDialogContent choices={choices} close={close} />);
}

function CleanupFilesDialogContent({ choices, close }: { choices: CleanupChoicesType; close: (value?: CleanupChoicesType) => void; }) {
    const { t } = useTranslation();
    const snap = useSnapshot(choices);

    const getVal = (key: CleanupChoice) => !!snap[key];

    function onChange(key: CleanupChoice, val: boolean) {
        (choices as unknown as Record<CleanupChoice, boolean>)[key] = val;
        if ((choices.trashSourceFile || choices.trashTmpFiles) && !choices.closeFile) {
            choices.closeFile = true;
        }
    }

    const trashTmpFiles = getVal('trashTmpFiles');
    const trashSourceFile = getVal('trashSourceFile');
    const trashProjectFile = getVal('trashProjectFile');

    return (
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>{t('Cleanup files?')}</DialogTitle>
                <DialogDescription>{t('What do you want to do after exporting a file or when pressing the "delete source file" button?')}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-6">
                <CheckRow label={t('Close currently opened file')} checked={getVal('closeFile')} disabled={trashSourceFile || trashTmpFiles} onChange={(v) => onChange('closeFile', v)} />

                <div className="flex flex-col gap-2">
                    <CheckRow label={t('Trash auto-generated files')} checked={trashTmpFiles} onChange={(v) => onChange('trashTmpFiles', v)} />
                    <CheckRow label={t('Trash original source file')} checked={trashSourceFile} onChange={(v) => onChange('trashSourceFile', v)} />
                    <CheckRow label={t('Trash project LLC file')} checked={trashProjectFile} onChange={(v) => onChange('trashProjectFile', v)} />
                    <CheckRow label={t('Permanently delete the files if trash fails?')} disabled={!(trashTmpFiles || trashProjectFile || trashSourceFile)} checked={getVal('deleteIfTrashFails')} onChange={(v) => onChange('deleteIfTrashFails', v)} />
                </div>

                <div className="flex flex-col gap-2">
                    <CheckRow label={t('Show this dialog every time?')} checked={getVal('askForCleanup')} onChange={(v) => onChange('askForCleanup', v)} />
                    <CheckRow label={t('Do all of this automatically after exporting a file?')} checked={getVal('cleanupAfterExport')} onChange={(v) => onChange('cleanupAfterExport', v)} />
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={() => close(undefined)}>{t('Cancel')}</Button>
                {/* for convenience, focus confirm: they probably just want to use current options https://github.com/mifi/lossless-cut/issues/2622 */}
                <Button autoFocus onClick={() => close({ ...choices })}>{t('Confirm')}</Button>
            </DialogFooter>
        </DialogContent>
    );
}

export function CheckRow({ label, checked, disabled, onChange }: { label: ReactNode; checked: boolean; disabled?: boolean | undefined; onChange: (checked: boolean) => void; }) {
    return (
        <Label className="text-sm font-normal flex items-center gap-2">
            <Checkbox checked={checked} disabled={disabled} onCheckedChange={(v) => onChange(v === true)} />
            {label}
        </Label>
    );
}

// Decimate

export async function openDecimateDialog() {
    const state = proxy({ fps: '20', n: '1' });
    return openCustomDialog<{ n: number; fps: number; }>((close) => <DecimateDialogContent state={state} close={close} />);
}

function DecimateDialogContent({ state, close }: { state: { fps: string; n: string; }; close: (value?: { n: number; fps: number; }) => void; }) {
    const { t } = useTranslation();
    const snap = useSnapshot(state, { sync: true });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const n = Number(state.n);
        const fps = Number(state.fps);
        if (Number.isNaN(n) || n <= 0 || Number.isNaN(fps) || fps <= 0) return;
        close({ n, fps });
    }

    return (
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>{t('Decimate video')}</DialogTitle>
                <DialogDescription>{t('Decimate allows you to losslessly extract only the keyframes from a video, discarding all non-keyframes. You can also optionally drop some of the keyframes. This can dramatically speed up playback and is useful for shortening long videos with little motion, such as creating time-lapse videos.')}</DialogDescription>
            </DialogHeader>

            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
                <Label className="text-sm font-normal flex flex-col items-start gap-1">
                    {t('Keep every nth keyframe. Use the value "1" to keep all keyframes')}
                    <Input value={snap.n} placeholder="n" onChange={(e) => { state.n = e.target.value; }} />
                </Label>
                <Label className="text-sm font-normal flex flex-col items-start gap-1">
                    {t('Output video frame rate (frames per second)')}
                    <Input value={snap.fps} onChange={(e) => { state.fps = e.target.value; }} />
                </Label>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => close(undefined)}>{t('Cancel')}</Button>
                    <Button type="submit">{t('Confirm')}</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
