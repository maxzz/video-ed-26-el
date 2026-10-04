import type { ReactNode } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useSnapshot } from 'valtio';
import { useTranslation } from 'react-i18next';
import { CheckIcon, CircleHelpIcon, CombineIcon, InfoIcon, SettingsIcon, TriangleAlertIcon } from 'lucide-react';
import { Button } from '@/ui/shadcn/button';
import { Checkbox } from '@/ui/shadcn/checkbox';
import { Label } from '@/ui/shadcn/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/shadcn/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/shadcn/table';
import { cn } from '@/utils/classnames';
import { setCustomOutDir, userSettings } from '@/editor/0-core/0-state/user-settings.ts';
import { askForOutDir } from '@/editor/0-core/2-lib/app-dialogs.tsx';
import { isMov } from '@/editor/0-core/2-lib/ffmpeg/streams.ts';
import { basename } from '@/editor/0-core/2-lib/node-shims.ts';
import { alwaysConcatMultipleFilesAtom, batchFilePathsAtom, detectedFileFormatAtom, fileFormatAtom } from '@/editor/2-file/0-state/file-atoms.ts';
import {
    concatClearBatchFilesAfterConcatAtom, concatEnableReadFileMetaAtom, concatFilesMetaAtom, concatIncludeAllStreamsAtom, concatMismatchesPathAtom,
    concatOptionsOpenAtom, concatOutputDirAtom, concatProblemsByFileAtom, concatShowMismatchAlertAtom, isConcatDialogShownAtom, simpleModeAtom,
} from '../0-state/concat-atoms.ts';
import { closeConcatDialog, onConcatClick, setConcatEnableReadFileMeta } from '../1-actions/concat-actions.ts';
import { onOutputFormatUserChange } from '@/editor/7-export/1-actions/export-actions.ts';
import { MergedFileNameEditor } from './merged-file-name-editor.tsx';
import { OutputFormatSelect } from '@/editor/7-export/3-ui/output-format-select.tsx';

/** Port of upstream components/ConcatDialog.tsx */
export function ConcatDialog() {
    const isShown = useAtomValue(isConcatDialogShownAtom);
    return (
        <Dialog open={isShown} onOpenChange={(open) => !open && closeConcatDialog()}>
            {isShown && <ConcatDialogContent />}
        </Dialog>
    );
}

function ConcatDialogContent() {
    const { t } = useTranslation();
    const simpleMode = useAtomValue(simpleModeAtom);
    const fileFormat = useAtomValue(fileFormatAtom);
    const detectedFileFormat = useAtomValue(detectedFileFormatAtom);
    const enableReadFileMeta = useAtomValue(concatEnableReadFileMetaAtom);
    const showMismatchAlert = useAtomValue(concatShowMismatchAlertAtom);
    const setOptionsOpen = useSetAtom(concatOptionsOpenAtom);

    return (
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>{t('Merge/concatenate files')}</DialogTitle>
                <DialogDescription className="whitespace-pre-wrap">
                    {t('This dialog can be used to concatenate files in series, e.g. one after the other:\n[file1][file2][file3]\nIt can NOT be used for merging tracks in parallell (like adding an audio track to a video).\nMake sure all files are of the exact same codecs & codec parameters (fps, resolution etc).')}
                </DialogDescription>
            </DialogHeader>

            <ConcatFilesList />

            <OutputDirRow />

            {fileFormat != null && <MergedFileNameEditor />}

            <div className="min-h-10 text-sm flex flex-col gap-2">
                {enableReadFileMeta && showMismatchAlert && (
                    <Alert>{t('A mismatch was detected in at least one file. You may proceed, but the resulting file might not be playable.')}</Alert>
                )}
                {!enableReadFileMeta && (
                    <Alert>{t('File compatibility check is not enabled, so the merge operation might not produce a valid output. Enable "Check compatibility" below to check file compatibility before merging.')}</Alert>
                )}
                {simpleMode && (
                    <div className="text-primary flex items-center gap-2">
                        <InfoIcon className="shrink-0 size-4" />
                        {t('You are in simple mode, meaning some functionality has been simplified or hidden.')}
                    </div>
                )}
            </div>

            <DialogFooter className="sm:items-center">
                {!simpleMode && (
                    <CheckRow className="mr-auto" checked={enableReadFileMeta} onChange={setConcatEnableReadFileMeta}>{t('Check compatibility')}</CheckRow>
                )}

                <Button variant="outline" onClick={closeConcatDialog}>{t('Cancel')}</Button>

                <Button variant="outline" onClick={() => setOptionsOpen(true)}>
                    <SettingsIcon /> {t('Options')}
                </Button>

                <OutputFormatSelect
                    className="max-w-80"
                    disabled={fileFormat == null || detectedFileFormat == null}
                    detectedFileFormat={detectedFileFormat}
                    fileFormat={fileFormat}
                    onOutputFormatUserChange={onOutputFormatUserChange}
                />

                <Button disabled={fileFormat == null} onClick={onConcatClick}>
                    <CombineIcon /> {t('Merge files')}
                </Button>
            </DialogFooter>

            <MergeOptionsDialog />
            <MismatchesDialog />
        </DialogContent>
    );
}

function ConcatFilesList() {
    const { t } = useTranslation();
    const paths = useAtomValue(batchFilePathsAtom);
    const allFilesMeta = useAtomValue(concatFilesMetaAtom);
    const problemsByFile = useAtomValue(concatProblemsByFileAtom);
    const setMismatchesPath = useSetAtom(concatMismatchesPathAtom);

    return (
        <div className="max-h-[30vh] text-sm overflow-y-auto">
            {paths.map((path, index) => (
                <div key={path} className="whitespace-nowrap my-1 overflow-x-auto flex items-center gap-1.5" title={path}>
                    <span className="text-muted-foreground">{`${index + 1}.`}</span>
                    <span>{basename(path)}</span>

                    {allFilesMeta[path]
                        ? problemsByFile[path]
                            ? (
                                <Button variant="ghost" size="icon-xs" className="ml-2 text-amber-600 dark:text-amber-400" title={t('Mismatches detected')} onClick={() => setMismatchesPath(path)}>
                                    <TriangleAlertIcon />
                                </Button>
                            )
                            : <CheckIcon className="shrink-0 ml-2 size-4 text-green-600 dark:text-green-400" />
                        : <CircleHelpIcon className="shrink-0 ml-2 size-4 text-amber-600 dark:text-amber-400" />}
                </div>
            ))}
        </div>
    );
}

function OutputDirRow() {
    const { t } = useTranslation();
    const outputDir = useAtomValue(concatOutputDirAtom);

    async function changeOutDir() {
        const newOutDir = await askForOutDir(outputDir);
        if (newOutDir) setCustomOutDir(newOutDir);
    }

    return (
        <div className="text-sm">
            {t('Save output to path:')}
            <button type="button" className="px-1 block font-mono text-left text-primary bg-primary/10 hover:bg-primary/20 rounded cursor-pointer break-all" onClick={changeOutDir}>
                {outputDir}
            </button>
        </div>
    );
}

function MismatchesDialog() {
    const { t } = useTranslation();
    const [path, setPath] = useAtom(concatMismatchesPathAtom);
    const problemsByFile = useAtomValue(concatProblemsByFileAtom);
    const problems = (path != null ? problemsByFile[path] : undefined) ?? [];

    return (
        <Dialog open={path != null} onOpenChange={(open) => !open && setPath(undefined)}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t('Mismatches detected')}</DialogTitle>
                    <DialogDescription className="break-all">{path != null ? basename(path) : undefined}</DialogDescription>
                </DialogHeader>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('Track')}</TableHead>
                            <TableHead>{t('Parameter')}</TableHead>
                            <TableHead>{t('Expected')}</TableHead>
                            <TableHead>{t('Actual')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {problems.map((problem) => (
                            <TableRow key={JSON.stringify(problem)}>
                                <TableCell className="text-muted-foreground">{problem.index + 1}</TableCell>
                                {problem.type === 'extraneous' && (<>
                                    <TableCell />
                                    <TableCell />
                                    <TableCell className="font-bold text-destructive">{t('Extraneous')}</TableCell>
                                </>)}
                                {problem.type === 'parameter_mismatch' && (<>
                                    <TableCell>{problem.key}</TableCell>
                                    <TableCell className="font-bold">{problem.values[0] ?? t('N/A')}</TableCell>
                                    <TableCell className="font-bold text-destructive">{problem.values[1] ?? t('N/A')}</TableCell>
                                </>)}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </DialogContent>
        </Dialog>
    );
}

function MergeOptionsDialog() {
    const { t } = useTranslation();
    const [open, setOpen] = useAtom(concatOptionsOpenAtom);
    const [includeAllStreams, setIncludeAllStreams] = useAtom(concatIncludeAllStreamsAtom);
    const [alwaysConcatMultipleFiles, setAlwaysConcatMultipleFiles] = useAtom(alwaysConcatMultipleFilesAtom);
    const [clearBatchFilesAfterConcat, setClearBatchFilesAfterConcat] = useAtom(concatClearBatchFilesAfterConcatAtom);
    const fileFormat = useAtomValue(fileFormatAtom);
    const { preserveMetadataOnMerge, preserveMovData, segmentsToChapters } = useSnapshot(userSettings);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t('Merge options')}</DialogTitle>
                    <DialogDescription className="sr-only">{t('Merge options')}</DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-3">
                    <CheckRow checked={includeAllStreams} onChange={setIncludeAllStreams}>
                        {`${t('Include all tracks?')} - ${t('If this is checked, all audio/video/subtitle/data tracks will be included. This may not always work for all file types. If not checked, only default streams will be included.')}`}
                    </CheckRow>
                    <CheckRow checked={preserveMetadataOnMerge} onChange={(v) => { userSettings.preserveMetadataOnMerge = v; }}>
                        {t('Preserve original metadata when merging? (slow)')}
                    </CheckRow>
                    {fileFormat != null && isMov(fileFormat) && (
                        <CheckRow checked={preserveMovData} onChange={(v) => { userSettings.preserveMovData = v; }}>
                            {t('Preserve all MP4/MOV metadata?')}
                        </CheckRow>
                    )}
                    <CheckRow checked={segmentsToChapters} onChange={(v) => { userSettings.segmentsToChapters = v; }}>
                        {t('Create chapters from merged segments? (slow)')}
                    </CheckRow>
                    <CheckRow checked={alwaysConcatMultipleFiles} onChange={setAlwaysConcatMultipleFiles}>
                        {t('Always open this dialog when opening multiple files')}
                    </CheckRow>
                    <CheckRow checked={clearBatchFilesAfterConcat} onChange={setClearBatchFilesAfterConcat}>
                        {t('Clear batch file list after merge')}
                    </CheckRow>

                    <p className="text-sm text-muted-foreground">
                        {t('Note that also other settings from the normal export dialog apply to this merge function. For more information about all options, see the export dialog.')}
                    </p>
                </div>

                <DialogFooter>
                    <Button onClick={() => setOpen(false)}>{t('Close')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function CheckRow({ checked, onChange, className, children }: { checked: boolean; onChange: (checked: boolean) => void; className?: string; children: ReactNode; }) {
    return (
        <Label className={cn('text-sm font-normal leading-snug flex items-start gap-2', className)}>
            <Checkbox className="mt-0.5" checked={checked} onCheckedChange={(v) => onChange(v === true)} />
            {children}
        </Label>
    );
}

function Alert({ children }: { children: ReactNode; }) {
    return (
        <div className="flex items-start gap-1.5">
            <TriangleAlertIcon className="shrink-0 mt-0.5 size-4 text-amber-600 dark:text-amber-400" />
            {children}
        </div>
    );
}
