import type { ReactNode } from 'react';
import i18n from 'i18next';
import { Trans } from 'react-i18next';
import invariant from 'tiny-invariant';
import pMap from 'p-map';
import { ArrowRightIcon, CircleHelpIcon, InfoIcon, TriangleAlertIcon } from 'lucide-react';
import type { OpenDialogOptions } from '@shared/ipc-contract.ts';
import { formatDuration } from '../../../editor/0-core/8-lib/duration.ts';
import { isWindows, mainApi } from '../../../editor/0-core/7-actions/0-main-api.ts';
import { fs } from '../../../editor/0-core/8-lib/node-shims.ts';
import { testFailFsOperation, trashFile, unlinkWithRetry } from '../../../editor/0-core/8-lib/util.ts';
import type { ParseTimecode } from '../../../editor/0-core/8-lib/9-types-core.ts';
import type { FindKeyframeMode } from '../../../editor/0-core/8-lib/ffmpeg/ffmpeg.ts';
import { fireDialog, openCustomDialog } from '../7-0-dialogs/dialogs.ts';
import { toast } from '../7-0-dialogs/toast.tsx';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/ui/shadcn/dialog';
import { Button } from '@/ui/shadcn/button';

// Port of upstream dialogs/index.tsx (SweetAlert dialogs replaced by fireDialog)

// https://github.com/mifi/lossless-cut/issues/1495
export async function showOpenDialog({ filters = isWindows ? [{ name: i18n.t('All Files'), extensions: ['*'] }] : undefined, title, ...props }: OpenDialogOptions & { title: string; }) {
    return mainApi.showOpenDialog({ ...props, title, ...(filters != null ? { filters } : {}) });
}

export async function askForOutDir(defaultPath?: string | undefined) {
    const { filePaths } = await showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        ...(defaultPath != null && { defaultPath }),
        title: i18n.t('Where do you want to save output files?'),
        message: i18n.t('Where do you want to save output files? Make sure there is enough free space in this folder'),
        buttonLabel: i18n.t('Select output folder'),
    });
    const [filePath] = filePaths;
    if (!filePath || filePaths.length !== 1) return undefined;
    // sanity check for directory. Don't trust showOpenDialog 100%, see https://github.com/mifi/lossless-cut/issues/2719
    if (!(await fs.lstat(filePath)).isDirectory()) {
        console.warn('Selected output path is not a directory', filePath);
        return undefined;
    }
    return filePath;
}

export async function askForFfPath(defaultPath?: string | undefined) {
    const { filePaths } = await showOpenDialog({
        properties: ['openDirectory'],
        ...(defaultPath != null && { defaultPath }),
        title: i18n.t('Select custom FFmpeg directory'),
    });
    return filePaths.length === 1 ? filePaths[0] : undefined;
}

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

export async function askForImportChapters() {
    const { isConfirmed } = await fireDialog({
        icon: 'question',
        text: i18n.t('This file has embedded chapters. Do you want to import the chapters as cut-segments?'),
        showCancelButton: true,
        cancelButtonText: i18n.t('Ignore chapters'),
        confirmButtonText: i18n.t('Import chapters'),
    });
    return isConfirmed;
}

const maxSegments = 1000;

async function askForNumSegments() {
    const { value } = await fireDialog({
        input: 'number',
        inputAttributes: { min: String(0), max: String(maxSegments) },
        showCancelButton: true,
        inputValue: '2',
        text: i18n.t('Divide timeline into a number of equal length segments'),
        inputValidator: (v) => {
            const parsed = parseInt(v, 10);
            if (!Number.isNaN(parsed) && parsed >= 2 && parsed <= maxSegments) return null;
            return i18n.t('Please input a valid number of segments');
        },
    });
    if (value == null) return undefined;
    return parseInt(value, 10);
}

export async function createNumSegments(totalDuration: number) {
    const numSegments = await askForNumSegments();
    if (numSegments == null) return undefined;
    const edl: { start: number; end: number; }[] = [];
    const segDuration = totalDuration / numSegments;
    for (let i = 0; i < numSegments; i += 1) {
        edl.push({ start: i * segDuration, end: i === numSegments - 1 ? totalDuration : (i + 1) * segDuration });
    }
    return edl;
}

export async function askForSegmentDuration({ totalDuration, inputPlaceholder, parseTimecode }: {
    totalDuration: number;
    inputPlaceholder: string;
    parseTimecode: ParseTimecode;
}) {
    const { value } = await fireDialog({
        input: 'text',
        showCancelButton: true,
        inputValue: inputPlaceholder,
        text: i18n.t('Divide timeline into a number of segments with the specified length'),
        inputValidator: (v) => {
            const segmentDuration = parseTimecode(v);
            if (segmentDuration != null) {
                const numSegments = Math.ceil(totalDuration / segmentDuration);
                if (segmentDuration > 0 && numSegments <= maxSegments) {
                    if (segmentDuration < totalDuration) return null;
                    return i18n.t('Value must be shorter than total duration ({{totalDuration}})', { totalDuration: formatDuration({ seconds: totalDuration, shorten: true }) });
                }
            }
            return i18n.t('Please input a valid duration. Example: {{example}}', { example: inputPlaceholder });
        },
    });
    if (value == null) return undefined;
    return parseTimecode(value);
}

// https://github.com/mifi/lossless-cut/issues/1153
async function askForSegmentsRandomDurationRange() {
    function parse(str: string) {
        const match = str.replaceAll(/\s/g, '').match(/^duration([\d.]+)to([\d.]+),gap([-\d.]+)to([-\d.]+)$/i);
        if (!match) return undefined;
        const parsed = match.slice(1).map((val) => parseFloat(val));
        const durationMin = parsed[0]!;
        const durationMax = parsed[1]!;
        const gapMin = parsed[2]!;
        const gapMax = parsed[3]!;
        if (!(parsed.every((val) => !Number.isNaN(val)) && durationMin <= durationMax && gapMin <= gapMax && durationMin > 0)) return undefined;
        return { durationMin, durationMax, gapMin, gapMax };
    }

    const { value } = await fireDialog({
        input: 'text',
        showCancelButton: true,
        inputValue: 'Duration 3 to 5, Gap 0 to 2',
        text: i18n.t('Divide timeline into segments with randomized durations and gaps between segments, in a range specified in seconds with the correct format.'),
        inputValidator: (v) => (parse(v) ? null : i18n.t('Invalid input')),
    });
    if (value == null) return undefined;
    return parse(value);
}

async function askForSegmentsStartOrEnd(text: string) {
    const { value } = await fireDialog({
        input: 'radio',
        showCancelButton: true,
        inputOptions: { start: i18n.t('Start'), end: i18n.t('End'), both: i18n.t('Both') },
        inputValue: 'both',
        text,
    });
    if (!value) return undefined;
    return value === 'both' ? ['start', 'end'] as const : [value as 'start' | 'end'] as const;
}

export async function askForAlignSegments() {
    const startOrEnd = await askForSegmentsStartOrEnd(i18n.t('Do you want to align the segment start or end timestamps to keyframes?'));
    if (startOrEnd == null) return undefined;

    const { value: mode } = await fireDialog<FindKeyframeMode | 'opposing'>({
        input: 'radio',
        showCancelButton: true,
        inputOptions: {
            nearest: i18n.t('Nearest keyframe'),
            before: i18n.t('Previous keyframe'),
            after: i18n.t('Next keyframe'),
            opposing: i18n.t('Segment start to previous keyframe and end to next keyframe'),
        } satisfies Record<FindKeyframeMode | 'opposing', unknown>,
        inputValue: 'before',
        text: i18n.t('Do you want to align segment times to the nearest, previous or next keyframe?'),
    });
    if (mode == null) return undefined;
    return { mode, startOrEnd };
}

export interface CleanupChoicesType {
    trashTmpFiles: boolean;
    closeFile: boolean;
    askForCleanup: boolean;
    cleanupAfterExport?: boolean | undefined;
    trashSourceFile?: boolean;
    trashProjectFile?: boolean;
    deleteIfTrashFails?: boolean;
}
export type CleanupChoice = keyof CleanupChoicesType;

function parseBytesHuman(str: string) {
    const match = str.replaceAll(/\s/g, '').match(/^(\d+)([gkmt]?)b$/i);
    if (!match) return undefined;
    const size = parseInt(match[1]!, 10);
    const unit = match[2]!.toLowerCase();
    if (unit === 't') return size * 1024 * 1024 * 1024 * 1024;
    if (unit === 'g') return size * 1024 * 1024 * 1024;
    if (unit === 'm') return size * 1024 * 1024;
    if (unit === 'k') return size * 1024;
    return size;
}

export async function createFixedByteSixedSegments({ fileDuration, fileSize }: { fileDuration: number; fileSize: number; }) {
    const example = '100 MB';
    const { value } = await fireDialog({
        input: 'text',
        showCancelButton: true,
        inputValue: example,
        inputPlaceholder: example,
        text: i18n.t('Divide timeline into a number of segments with an approximate byte size'),
        inputValidator: (v) => (parseBytesHuman(v) != null ? undefined : i18n.t('Please input a valid size. Example: {{example}}', { example })),
    });
    if (value == null) {
        return undefined;
    }
    const parsed = parseBytesHuman(value);
    invariant(parsed != null);
    return fileDuration * (parsed / fileSize);
}

export async function createRandomSegments(totalDuration: number) {
    const response = await askForSegmentsRandomDurationRange();
    if (response == null) {
        return undefined;
    }

    const { durationMin, durationMax, gapMin, gapMax } = response;
    const randomInRange = (min: number, max: number) => min + Math.random() * (max - min);

    const edl: { start: number; end: number; }[] = [];
    for (let start = randomInRange(gapMin, gapMax); start < totalDuration && edl.length < maxSegments; start += randomInRange(gapMin, gapMax)) {
        const end = Math.min(totalDuration, start + randomInRange(durationMin, durationMax));
        edl.push({ start, end });
        start = end;
    }
    return edl;
}

const MovSuggestion = ({ fileFormat }: { fileFormat: string | undefined; }) => (fileFormat === 'mp4' ? <li><Trans>Change output <b>Format</b> from <b>MP4</b> to <b>MOV</b></Trans></li> : null);
const OutputFormatSuggestion = () => <li><Trans>Select a different output <b>Format</b> (<b>matroska</b> and <b>mp4</b> support most codecs)</Trans></li>;
const WorkingDirectorySuggestion = () => <li><Trans>Set a different <b>Working directory</b></Trans></li>;
const DifferentFileSuggestion = () => <li><Trans>Try with a <b>Different file</b></Trans></li>;
const HelpSuggestion = () => <li><Trans>See <b>Help</b></Trans> menu</li>;
const ErrorReportSuggestion = () => <li><Trans>If nothing helps, you can send an <b>Error report</b></Trans></li>;

export async function showExportFailedDialog({ fileFormat, safeOutputFileName }: { fileFormat: string | undefined; safeOutputFileName: boolean; }) {
    const html = (
        <div className="text-left">
            <Trans>Try one of the following before exporting again:</Trans>
            <ol className="mt-2 pl-5 list-decimal">
                {!safeOutputFileName && <li><Trans>Output file names are not sanitized. Try to enable sanitazion or check your segment labels for invalid characters.</Trans></li>}
                <MovSuggestion fileFormat={fileFormat} />
                <OutputFormatSuggestion />
                <li><Trans>Disable unnecessary <b>Tracks</b></Trans></li>
                <li><Trans>Try both <b>Normal cut</b> and <b>Keyframe cut</b></Trans></li>
                <WorkingDirectorySuggestion />
                <DifferentFileSuggestion />
                <HelpSuggestion />
                <ErrorReportSuggestion />
            </ol>
        </div>
    );
    const { isConfirmed } = await fireDialog({ title: i18n.t('Unable to export this file'), icon: 'error', html, showCancelButton: true, cancelButtonText: i18n.t('OK'), confirmButtonText: i18n.t('Report'), focusCancel: true });
    return isConfirmed;
}

export async function showConcatFailedDialog({ fileFormat }: { fileFormat: string | undefined; }) {
    const html = (
        <div className="text-left">
            <Trans>Try each of the following before merging again:</Trans>
            <ol className="mt-2 pl-5 list-decimal">
                <MovSuggestion fileFormat={fileFormat} />
                <OutputFormatSuggestion />
                <li><Trans>Disable <b>merge options</b></Trans></li>
                <WorkingDirectorySuggestion />
                <DifferentFileSuggestion />
                <HelpSuggestion />
                <ErrorReportSuggestion />
            </ol>
        </div>
    );
    const { isConfirmed } = await fireDialog({ title: i18n.t('Unable to merge files'), icon: 'error', html, showCancelButton: true, cancelButtonText: i18n.t('OK'), confirmButtonText: i18n.t('Report'), focusCancel: true });
    return isConfirmed;
}

export async function openYouTubeChaptersDialog(text: string) {
    const { isConfirmed } = await fireDialog({
        showCloseButton: true,
        showCancelButton: true,
        title: i18n.t('YouTube Chapters'),
        confirmButtonText: i18n.t('Copy to clipboard'),
        cancelButtonText: i18n.t('Close'),
        html: (
            <div className="max-h-75 text-left overflow-y-auto">
                <p className="mb-2">{i18n.t('Copy to YouTube description/comment:')}</p>
                <div className="whitespace-pre-wrap select-text text-xs font-semibold">{text}</div>
            </div>
        ),
    });
    if (isConfirmed) await mainApi.writeClipboardText(text);
}

export async function labelSegmentDialog({ currentName, maxLength }: { currentName: string; maxLength: number; }) {
    const { value } = await fireDialog({
        showCancelButton: true,
        title: i18n.t('Label current segment'),
        inputValue: currentName,
        input: currentName.includes('\n') ? 'textarea' : 'text',
        inputValidator: (v) => (v.length > maxLength ? `${i18n.t('Max length')} ${maxLength}` : null),
    });
    return value;
}

export async function selectSegmentsByLabelDialog(currentName?: string | undefined) {
    const { value } = await fireDialog({
        showCancelButton: true,
        title: i18n.t('Select segments by label'),
        inputValue: currentName ?? '',
        input: 'text',
    });
    return value;
}

export const UnorderedList = ({ children }: { children: ReactNode; }) => <ul className="pl-1 flex flex-col gap-1">{children}</ul>;

export const ListItem = ({ icon, className, children }: { icon: ReactNode; className?: string; children: ReactNode; }) => (
    <li className={`flex items-start gap-1.5 ${className ?? ''}`}>
        <span className="shrink-0 mt-0.5 [&_svg]:size-3">{icon}</span>
        <span>{children}</span>
    </li>
);

export const Notices = ({ notices }: { notices: string[]; }) => notices.map((msg) => (
    <ListItem key={msg} icon={<InfoIcon />} className="text-blue-600 dark:text-blue-400">{msg}</ListItem>
));

export const Warnings = ({ warnings }: { warnings: string[]; }) => warnings.map((msg) => (
    <ListItem key={msg} icon={<TriangleAlertIcon />} className="text-amber-600 dark:text-amber-400">{msg}</ListItem>
));

export const OutputIncorrectSeeHelpMenu = () => (
    <ListItem icon={<CircleHelpIcon />}>{i18n.t('If output does not look right, see the Help menu.')}</ListItem>
);

export async function askForPlaybackRate({ detectedFps, outputPlaybackRate }: { detectedFps: number | undefined; outputPlaybackRate: number; }) {
    const fps = detectedFps || 1;
    const currentFps = fps * outputPlaybackRate;

    function parseValue(v: string) {
        if (v.trim() === '') return 1;
        const newFps = parseFloat(v);
        return Number.isNaN(newFps) ? undefined : newFps / fps;
    }

    const { value, isConfirmed } = await fireDialog({
        title: i18n.t('Change FPS'),
        input: 'text',
        inputValue: currentFps.toFixed(5),
        text: i18n.t('This option lets you losslessly change the speed at which media players will play back the exported file. For example if you double the FPS, the playback speed will double (and duration will halve), however all the frames will be intact and played back (but faster). Be careful not to set it too high, as the player might not be able to keep up (playback CPU usage will increase proportionally to the speed!)'),
        showCancelButton: true,
        inputValidator: (v) => (parseValue(v) != null ? null : i18n.t('Please enter a valid number.')),
    });
    if (!isConfirmed || value == null) return undefined;
    return parseValue(value);
}

export async function promptDownloadMediaUrl(outPath: string) {
    const { value } = await fireDialog({
        title: i18n.t('Open media from URL'),
        input: 'text',
        inputPlaceholder: 'https://example.com/video.m3u8',
        text: i18n.t('Losslessly download a whole media file from the specified URL, mux it into an mkv file and open it in LosslessCut. This can be useful if you need to download a video from a website, e.g. a HLS streaming video. For example in Chrome you can open Developer Tools and view the network traffic, find the playlist (e.g. m3u8) and copy paste its URL here.'),
        showCancelButton: true,
    });
    if (!value) return false;
    await mainApi.ffDownloadMediaUrl(value, outPath);
    return true;
}

export async function deleteFiles({ paths, deleteIfTrashFails, signal }: { paths: string[]; deleteIfTrashFails?: boolean | undefined; signal: AbortSignal; }) {
    const failedToTrashFiles: string[] = [];

    for (const path of paths) {
        try {
            if (testFailFsOperation) throw new Error('test trash failure');
            await trashFile(path);
            signal.throwIfAborted();
        } catch (err) {
            console.error(err);
            failedToTrashFiles.push(path);
        }
    }

    if (failedToTrashFiles.length === 0) return;

    if (!deleteIfTrashFails) {
        const { isConfirmed } = await fireDialog({
            icon: 'warning',
            text: i18n.t('Unable to move file to trash. Do you want to permanently delete it?'),
            confirmButtonText: i18n.t('Permanently delete'),
            dangerConfirm: true,
            showCancelButton: true,
        });
        if (!isConfirmed) return;
    }

    await pMap(failedToTrashFiles, async (path) => unlinkWithRetry(path, { signal }), { concurrency: 5 });
}

export { toastError } from '../7-0-dialogs/toast.tsx';

export function errorToast(text: string) {
    toast.fire({ icon: 'error', text });
}

export const showPlaybackFailedMessage = () => errorToast(i18n.t('Unable to playback this file. Try to convert to supported format from the menu'));

/** Simple confirmation (port of upstream GenericDialog confirmDialog) */
export async function confirmDialog({ title, description, confirmButtonText, cancelButtonText, danger }: {
    title?: ReactNode;
    description: ReactNode;
    confirmButtonText?: ReactNode;
    cancelButtonText?: ReactNode;
    danger?: boolean;
}) {
    const { isConfirmed } = await fireDialog({
        title: title ?? i18n.t('Confirm'),
        text: description,
        showCancelButton: true,
        confirmButtonText: confirmButtonText ?? i18n.t('Confirm'),
        ...(cancelButtonText != null && { cancelButtonText }),
        dangerConfirm: danger,
    });
    return isConfirmed;
}
