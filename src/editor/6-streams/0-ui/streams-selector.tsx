import type { DragEvent } from 'react';
import { useAtomValue } from 'jotai';
import { Trans, useTranslation } from 'react-i18next';
import prettyBytes from 'pretty-bytes';
import {
    ArrowDown01Icon, ArrowUp01Icon, BanIcon, BinaryIcon, BookIcon, CaptionsIcon, EyeIcon, FileInputIcon, FileOutputIcon, FilterIcon, ImageIcon, InfoIcon, LanguagesIcon, MapIcon,
    MenuIcon, PaperclipIcon, PencilIcon, Trash2Icon, VideoIcon, VideoOffIcon, Volume2Icon, VolumeXIcon,
} from 'lucide-react';
import type { FFprobeChapter, FFprobeFormat, FFprobeStream } from '@shared/ffprobe';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { userSettings, userSettingsAtom } from '@/editor/0-core/9-state/user-settings.ts';
import { formatTimecode } from '@/editor/0-core/9-state/timecode.ts';
import { setWorking, withErrorHandling } from '@/editor/0-core/9-state/working.ts';
import { mainApi, preloadEnv } from '@/editor/0-core/8-lib/main-api.ts';
import { extractSubtitleTrackToSegments, type FileStream, getStreamFps } from '@/editor/0-core/8-lib/ffmpeg/ffmpeg.ts';
import { attachedPicDisposition, getActiveDisposition, isGpsStream } from '@/editor/0-core/8-lib/ffmpeg/streams.ts';
import { type ContentDispositionOptions, contentDispositionOptionsSchema, deleteDispositionValue, dispositionOptions, type ParamsByFile } from '@/editor/0-core/8-lib/types.ts';
import { streamsSelectorShownAtom } from '@/components/2-main/0-all/a-panels-atoms.ts';
import { externalFilesMetaAtom, fileDurationAtom, filePathAtom, mainFileChaptersAtom, mainFileFormatDataAtom, mainStreamsAtom, paramsByFileAtom, shortestFlagAtom } from '@/editor/2-file/9-state/a-file-atoms.ts';
import { loadCutSegments } from '@/editor/5-segments/7-actions/segment-actions.ts';
import { extractAllStreams, extractSingleStream } from '@/editor/7-export/7-actions/export-actions.ts';
import { Button } from '@/ui/shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/ui/shadcn/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/ui/shadcn/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/ui/shadcn/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/shadcn/table';
import { cn } from '@/utils/classnames';
import { copyStreamIdsByFileAtom, isCopyingStreamIdIn, nonCopiedExtraStreamsAtom, setCopyStreamIdsForPath, toggleCopyAllStreamsForPath, toggleCopyStreamId, toggleCopyStreamIds } from '../9-state/streams-store.ts';
import { setEditingFile, setEditingStream } from '../9-state/streams-ui-atoms.ts';
import { addStreamSourceFile, changeEnabledStreamsFilter, removeExternalFile, showIncludeExternalStreamsDialog, updateStreamParams } from '../7-actions/streams-actions.tsx';
import { EditFileDialog, EditStreamDialog } from './edit-dialogs.tsx';
import { GpsMap } from './gps-map.tsx';
import { Json5Dialog } from './json-dialog.tsx';

// Port of upstream StreamsSelector.tsx and its dialog in App.tsx

const unchangedDispositionValue = 'llc_disposition_unchanged';

function getStreamEffectiveDisposition(paramsByFile: ParamsByFile, fileId: string, stream: FFprobeStream) {
    const customDisposition = paramsByFile.get(fileId)?.paramsByStream.get(stream.index)?.disposition;
    if (customDisposition) return customDisposition;
    return getActiveDisposition(stream.disposition ?? {});
}

function getFormatDuration(format: FFprobeFormat | undefined) {
    if (!format || !format.duration) return undefined;
    const parsed = parseFloat(format.duration);
    return Number.isNaN(parsed) ? undefined : parsed;
}

async function loadSubtitleTrackToSegments(filePath: string, streamId: number) {
    setWorking(true);
    try {
        appStore.set(streamsSelectorShownAtom, false);
        await withErrorHandling(async () => {
            loadCutSegments({ segments: await extractSubtitleTrackToSegments(filePath, streamId), append: true, clampDuration: appStore.get(fileDurationAtom) });
        });
    } finally {
        setWorking(undefined);
    }
}

async function onStreamSourceFileDrop(ev: DragEvent<HTMLDivElement>) {
    ev.preventDefault();
    const filePaths = [...ev.dataTransfer.files].map((f) => preloadEnv.getPathForFile(f));
    await withErrorHandling(async () => {
        if (filePaths.length !== 1) return;
        await mainApi.focusWindow();
        await addStreamSourceFile(filePaths[0]!);
    });
}

function removeFile(path: string) {
    setCopyStreamIdsForPath(path, () => ({}));
    removeExternalFile(path);
}

function StreamRow({ filePath, stream, copyStream, fileDuration, paramsByFile, isMainFile }: {
    filePath: string;
    stream: FFprobeStream;
    copyStream: boolean;
    fileDuration: number | undefined;
    paramsByFile: ParamsByFile;
    isMainFile: boolean;
}) {
    const { t } = useTranslation();

    const effectiveDisposition = getStreamEffectiveDisposition(paramsByFile, filePath, stream);
    const effectiveLanguage = paramsByFile.get(filePath)?.paramsByStream.get(stream.index)?.metadata?.['language'] ?? stream.tags?.language;

    const bitrate = parseInt(stream.bit_rate!, 10);
    const streamDuration = parseInt(stream.duration!, 10);
    const duration = !Number.isNaN(streamDuration) ? streamDuration : fileDuration;

    let Icon: typeof BanIcon;
    let codecTypeHuman: string;
    if (stream.codec_type === 'audio') {
        Icon = copyStream ? Volume2Icon : VolumeXIcon;
        codecTypeHuman = t('audio');
    } else if (stream.codec_type === 'video') {
        if (effectiveDisposition === attachedPicDisposition) {
            Icon = copyStream ? ImageIcon : BanIcon;
            codecTypeHuman = t('thumbnail');
        } else {
            Icon = copyStream ? VideoIcon : VideoOffIcon;
            codecTypeHuman = t('video');
        }
    } else if (stream.codec_type === 'subtitle') {
        Icon = copyStream ? CaptionsIcon : BanIcon;
        codecTypeHuman = t('subtitle');
    } else if (stream.codec_type === 'attachment') {
        Icon = copyStream ? PaperclipIcon : BanIcon;
        codecTypeHuman = t('attachment');
    } else {
        Icon = copyStream ? BinaryIcon : BanIcon;
        codecTypeHuman = stream.codec_type ?? '';
    }

    const streamFps = getStreamFps(stream);
    const title = stream.tags?.title;
    const codecTag = stream.codec_tag !== '0x0000' && stream.codec_tag_string;

    function onDispositionChange(value: string) {
        let newDisposition: ContentDispositionOptions | typeof deleteDispositionValue | undefined;
        const dispositionParsed = contentDispositionOptionsSchema.safeParse(value);
        if (dispositionParsed.success) {
            newDisposition = dispositionParsed.data;
        } else if (value === deleteDispositionValue) {
            newDisposition = deleteDispositionValue; // needs a separate value (not a real disposition)
        } // else unchanged (undefined)

        updateStreamParams(filePath, stream.index, (params) => { params.disposition = newDisposition; });
    }

    return (
        <TableRow className={cn(!copyStream && 'opacity-40')}>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon-sm"
                        className={copyStream ? 'text-green-500' : 'text-red-500'}
                        title={`${t('Click to toggle track inclusion when exporting')} (type ${codecTypeHuman})`}
                        onClick={() => toggleCopyStreamId(filePath, stream.index)}
                    >
                        <Icon />
                    </Button>
                    <span className="w-4 text-center">{stream.index + 1}</span>
                </div>
            </TableCell>
            <TableCell className="max-w-24 truncate" title={stream.codec_name}>{stream.codec_name} {codecTag}</TableCell>
            <TableCell>
                {duration != null && !Number.isNaN(duration) && formatTimecode({ seconds: duration, shorten: true })}
                {stream.nb_frames != null ? <span> {stream.nb_frames}f</span> : null}
            </TableCell>
            <TableCell>{!Number.isNaN(bitrate) && (stream.codec_type === 'audio' ? `${Math.round(bitrate / 1000)} kbps` : prettyBytes(bitrate, { bits: true }))}</TableCell>
            <TableCell className="whitespace-normal max-w-32 break-words" title={title}>{title}</TableCell>
            <TableCell className="max-w-16 truncate" title={effectiveLanguage}>{effectiveLanguage}</TableCell>
            <TableCell>{stream.width && stream.height && `${stream.width}x${stream.height}`} {stream.channels && `${stream.channels}c`} {stream.channel_layout} {streamFps && `${streamFps.toFixed(2)}fps`}</TableCell>
            <TableCell>
                <Select value={effectiveDisposition || unchangedDispositionValue} onValueChange={onDispositionChange}>
                    <SelectTrigger size="sm" className="w-32" title={t('Disposition')}><SelectValue /></SelectTrigger>
                    <SelectContent position="popper" className="max-h-72">
                        <SelectItem value={unchangedDispositionValue}>{t('Unchanged')}</SelectItem>
                        <SelectItem value={deleteDispositionValue}>{t('Remove')}</SelectItem>
                        <SelectSeparator />
                        {dispositionOptions.map((key) => <SelectItem key={key} value={key}>{key}</SelectItem>)}
                    </SelectContent>
                </Select>
            </TableCell>
            <TableCell className="text-right">
                <StreamMenu filePath={filePath} stream={stream} codecTypeHuman={codecTypeHuman} isMainFile={isMainFile} />
            </TableCell>
        </TableRow>
    );
}

function StreamMenu({ filePath, stream, codecTypeHuman, isMainFile }: { filePath: string; stream: FFprobeStream; codecTypeHuman: string; isMainFile: boolean; }) {
    const { t } = useTranslation();
    const trackInfoTitle = t('Track {{num}} info', { num: stream.index + 1 });

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm"><MenuIcon /></Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
                {/* https://github.com/radix-ui/primitives/issues/1836#issuecomment-1674338372 */}
                <Json5Dialog title={trackInfoTitle} json={stream}>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <InfoIcon />{trackInfoTitle}
                    </DropdownMenuItem>
                </Json5Dialog>

                <DropdownMenuItem onClick={() => setEditingStream({ streamId: stream.index, path: filePath })}>
                    <PencilIcon />{t('Edit track metadata')}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {isMainFile && (
                    <DropdownMenuItem onClick={() => extractSingleStream(stream.index)}>
                        <FileOutputIcon />{t('Extract this track as file')}
                    </DropdownMenuItem>
                )}

                {isMainFile && stream.codec_type === 'subtitle' && (
                    <DropdownMenuItem onClick={() => loadSubtitleTrackToSegments(filePath, stream.index)}>
                        <CaptionsIcon />{t('Create segments from subtitles')}
                    </DropdownMenuItem>
                )}

                {isGpsStream(stream as FileStream) && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <MapIcon />{t('Show GPS map')}
                            </DropdownMenuItem>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[85vw]">
                            <DialogHeader>
                                <DialogTitle><Trans>GPS track</Trans></DialogTitle>
                                <DialogDescription className="sr-only">{t('Show GPS map')}</DialogDescription>
                            </DialogHeader>
                            <GpsMap filePath={filePath} streamIndex={stream.index} />
                        </DialogContent>
                    </Dialog>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => toggleCopyStreamIds(filePath, (s) => s.codec_type === stream.codec_type)}>
                    <EyeIcon />{t('Toggle {{type}} tracks', { type: codecTypeHuman })}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function FileHeading({ path, format, chapters, isMainFile }: { path: string; format: FFprobeFormat | undefined; chapters?: FFprobeChapter[] | undefined; isMainFile: boolean; }) {
    const { t } = useTranslation();

    return (
        <div className="mb-1 pb-1 border-b flex items-center gap-4">
            <div className="grow text-sm font-bold break-all" title={path}>{path.replace(/.*[/\\]([^/\\]+)$/, '$1')}</div>

            <div className="flex flex-wrap items-center gap-1">
                {chapters && chapters.length > 0 && (
                    <Json5Dialog title={t('Chapters')} json={chapters}>
                        <Button variant="outline" size="icon-sm" title={t('Chapters')}><BookIcon /></Button>
                    </Json5Dialog>
                )}
                <Json5Dialog title={t('File info')} json={format}>
                    <Button variant="outline" size="icon-sm" title={t('File info')}><InfoIcon /></Button>
                </Json5Dialog>
                <Button variant="outline" size="icon-sm" title={t('Edit file metadata')} onClick={() => setEditingFile(path)}><PencilIcon /></Button>
                <Button variant="outline" size="icon-sm" title={t('Toggle all tracks')} onClick={() => toggleCopyAllStreamsForPath(path)}><EyeIcon /></Button>
                {isMainFile && <Button variant="outline" size="icon-sm" title={t('Filter tracks')} onClick={changeEnabledStreamsFilter}><FilterIcon /></Button>}
                {isMainFile && <Button variant="outline" size="icon-sm" title={t('Export each track as individual files')} onClick={extractAllStreams}><FileOutputIcon /></Button>}
                {!isMainFile && <Button variant="outline" size="icon-sm" title={t('Delete')} onClick={() => removeFile(path)}><Trash2Icon /></Button>}
            </div>
        </div>
    );
}

function StreamsHead() {
    const { t } = useTranslation();
    return (
        <TableHeader>
            <TableRow>
                <TableHead>{t('Keep?')}</TableHead>
                <TableHead>{t('Codec')}</TableHead>
                <TableHead>{t('Duration')}</TableHead>
                <TableHead>{t('Bitrate')}</TableHead>
                <TableHead>{t('Title')}</TableHead>
                <TableHead title={t('Language')}><LanguagesIcon className="size-4" /></TableHead>
                <TableHead>{t('Data')}</TableHead>
                <TableHead>{t('Disposition')}</TableHead>
                <TableHead />
            </TableRow>
        </TableHeader>
    );
}

function FileStreams({ path, streams, format, chapters, isMainFile }: { path: string; streams: FFprobeStream[]; format: FFprobeFormat | undefined; chapters?: FFprobeChapter[] | undefined; isMainFile: boolean; }) {
    const copyStreamIdsByFile = useAtomValue(copyStreamIdsByFileAtom);
    const paramsByFile = useAtomValue(paramsByFileAtom);
    const fileDuration = getFormatDuration(format);

    return (
        <div className="mb-8 py-2 overflow-x-auto" onDragOver={(e) => e.preventDefault()} onDrop={isMainFile ? onStreamSourceFileDrop : undefined}>
            <FileHeading path={path} format={format} chapters={chapters} isMainFile={isMainFile} />
            <Table className="text-xs">
                <StreamsHead />
                <TableBody>
                    {streams.map((stream) => (
                        <StreamRow
                            key={stream.index}
                            filePath={path}
                            stream={stream}
                            copyStream={isCopyingStreamIdIn(copyStreamIdsByFile, path, stream.index)}
                            fileDuration={fileDuration}
                            paramsByFile={paramsByFile}
                            isMainFile={isMainFile}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function AutoExportToggler() {
    const { t } = useTranslation();
    const { autoExportExtraStreams } = useAtomValue(userSettingsAtom);
    const Icon = autoExportExtraStreams ? FileOutputIcon : BanIcon;
    return (
        <Button variant="outline" size="sm" onClick={() => { userSettings.autoExportExtraStreams = !autoExportExtraStreams; }}>
            <Icon className={cn(!autoExportExtraStreams && 'text-destructive')} />
            {autoExportExtraStreams ? t('Extract') : t('Discard')}
        </Button>
    );
}

function StreamsSelectorContent() {
    const { t } = useTranslation();
    const mainFilePath = useAtomValue(filePathAtom);
    const mainFileFormat = useAtomValue(mainFileFormatDataAtom);
    const mainFileStreams = useAtomValue(mainStreamsAtom);
    const mainFileChapters = useAtomValue(mainFileChaptersAtom);
    const externalFilesMeta = useAtomValue(externalFilesMetaAtom);
    const nonCopiedExtraStreams = useAtomValue(nonCopiedExtraStreamsAtom);
    const shortestFlag = useAtomValue(shortestFlagAtom);

    if (mainFilePath == null) return null;

    const externalFilesEntries = Object.entries(externalFilesMeta);

    return (
        <div className="min-h-0 overflow-y-auto">
            <FileStreams path={mainFilePath} streams={mainFileStreams} format={mainFileFormat} chapters={mainFileChapters} isMainFile />

            {externalFilesEntries.map(([path, { streams, format }]) => (
                <FileStreams key={path} path={path} streams={streams} format={format} isMainFile={false} />
            ))}

            <div className="my-4 text-sm flex flex-col items-start gap-4">
                <Button variant="outline" size="sm" onClick={showIncludeExternalStreamsDialog}>
                    <FileInputIcon /> {t('Include more tracks from other file')}
                </Button>

                {nonCopiedExtraStreams.length > 0 && (
                    <div className="flex items-center gap-3">
                        <span>{t('Discard or extract unprocessable tracks to separate files?')}</span>
                        <AutoExportToggler />
                    </div>
                )}

                {externalFilesEntries.length > 0 && (
                    <div className="flex flex-col items-start gap-2">
                        <div>{t('When tracks have different lengths, do you want to make the output file as long as the longest or the shortest track?')}</div>
                        <Button variant="outline" size="sm" onClick={() => appStore.set(shortestFlagAtom, (v) => !v)}>
                            {shortestFlag ? <><ArrowDown01Icon />{t('Shortest')}</> : <><ArrowUp01Icon />{t('Longest')}</>}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

export function StreamsSelector() {
    const { t } = useTranslation();
    const shown = useAtomValue(streamsSelectorShownAtom);

    return (
        <>
            <Dialog open={shown} onOpenChange={(open) => appStore.set(streamsSelectorShownAtom, open)}>
                <DialogContent className="max-h-[90vh] sm:max-w-[95vw] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{t('Tracks')}</DialogTitle>
                        <DialogDescription>{t('Click to select which tracks to keep when exporting:')}</DialogDescription>
                    </DialogHeader>
                    {shown && <StreamsSelectorContent />}
                </DialogContent>
            </Dialog>

            <EditFileDialog />
            <EditStreamDialog />
        </>
    );
}
