import { type ReactNode } from "react";
import i18n from "i18next";
import invariant from "tiny-invariant";
import pMap from "p-map";
import { CircleHelpIcon, InfoIcon, TriangleAlertIcon } from "lucide-react";
import { mainApi } from "../../../editor/0-core/7-actions/0-main-api";
import { testFailFsOperation, trashFile, unlinkWithRetry } from "../../../editor/0-core/8-lib/util";
import { fireDialog } from "../7-0-dialogs/dialogs";
import { toast } from "../7-0-dialogs/toast";
import { askForNumSegments, maxSegments } from "./06-ask-for-num-segments";
import { askForSegmentsRandomDurationRange } from "./08-ask-for-segments-random-duration-range";

// Port of upstream dialogs/index.tsx (SweetAlert dialogs replaced by fireDialog)

export async function createNumSegments(totalDuration: number) {
    const numSegments = await askForNumSegments();
    if (numSegments == null) {
        return undefined;
    }
    const edl: { start: number; end: number; }[] = [];
    const segDuration = totalDuration / numSegments;

    for (let i = 0; i < numSegments; i += 1) {
        edl.push({ start: i * segDuration, end: i === numSegments - 1 ? totalDuration : (i + 1) * segDuration });
    }
    return edl;
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
    if (!match) {
        return undefined;
    }
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

export { toastError } from "../7-0-dialogs/toast";

export function errorToast(text: string) {
    toast.fire({ icon: 'error', text });
}

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
