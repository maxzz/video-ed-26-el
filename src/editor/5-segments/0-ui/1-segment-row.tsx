import { type CSSProperties, type MouseEvent } from "react";
import { useAtomValue } from "jotai";
import { cn } from "@/utils/classnames";
import { useTranslation } from "react-i18next";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import prettyBytes from "pretty-bytes";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/ui/shadcn/context-menu";
import { CircleCheckIcon, CircleIcon, SaveIcon } from "lucide-react";

import { type InverseCutSegment, type StateSegment } from "@/editor/0-core/8-lib/9-types-core";
import { formatTimecodeAtom, getFrameCountAtom } from "@/editor/0-core/9-state/timecode";
import { runAction } from "@/editor/0-core/7-actions/kbd-actions";
import { jumpSegEnd, jumpSegStart } from "@/editor/3-player/7-actions/player-actions";
import { getSegmentTags } from "../8-lib/segment-utils";
import { darkModeAtom, getSegColorAtom, invertCutSegmentsAtom } from "../9-state/a-seg-ui-atoms";
import * as seg from "../7-actions/segment-actions";
import { editSegmentTags, tmcmd_mutateSegmentsByExpr, reorderSegmentDialog, tmcmd_selectSegmentsByExpr } from "../7-actions/segment-dialogs";

// Port of upstream SegmentList.tsx Segment

type ListSegment = StateSegment | InverseCutSegment;

export function SortableSegmentRow({ segment, index, isActive, selected }: { segment: ListSegment; index: number; isActive: boolean; selected: boolean; }) {
    const invertCutSegments = useAtomValue(invertCutSegmentsAtom);

    const sortable = useSortable({
        id: segment.segId,
        transition: { duration: 150, easing: 'ease-in-out' },
        disabled: invertCutSegments,
    });

    const style: CSSProperties = {
        visibility: sortable.isDragging ? 'hidden' : undefined,
        transform: CSS.Transform.toString(sortable.transform),
        transition: [...(sortable.transition ? [sortable.transition] : []), 'opacity 100ms ease-out'].join(', '),
    };

    function handleSegmentClick(e: MouseEvent<HTMLDivElement>) {
        e.currentTarget.blur();
        if (!invertCutSegments) {
            seg.setCurrentSegIndex(index);
        }
    }

    function onDoubleClick() {
        if (invertCutSegments) {
            return;
        }
        jumpSegStart(index);
    }

    const row = (
        <div ref={sortable.setNodeRef} role="button" style={style} onClick={handleSegmentClick} onDoubleClick={onDoubleClick}>
            <SegmentRowContent
                segment={segment}
                index={index}
                isActive={isActive}
                selected={selected}
                dragHandleProps={{ ...sortable.attributes, ...sortable.listeners }}
            />
        </div>
    );

    if (invertCutSegments || !('segColorIndex' in segment)) return row;

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
            <SegmentContextMenuContent segment={segment} index={index} />
        </ContextMenu>
    );
}

export function SegmentRowContent({ segment, index, isActive, selected, dragging, dragHandleProps }: {
    segment: ListSegment;
    index: number;
    isActive?: boolean;
    selected?: boolean;
    dragging?: boolean;
    dragHandleProps?: object;
}) {
    const invertCutSegments = useAtomValue(invertCutSegmentsAtom);
    const formatTimecode = useAtomValue(formatTimecodeAtom);
    const getFrameCount = useAtomValue(getFrameCountAtom);
    const { t } = useTranslation();

    const duration = segment.end == null ? undefined : segment.end - segment.start;
    const estimatedSize = seg.getSegEstimatedSize(segment);

    const timeStr = segment.end == null
        ? formatTimecode({ seconds: segment.start })
        : `${formatTimecode({ seconds: segment.start })} - ${formatTimecode({ seconds: segment.end })}`;

    const tags = getSegmentTags('tags' in segment ? segment : {});
    const cursor = invertCutSegments ? undefined : (dragging ? 'grabbing' : 'grab');
    const CheckIcon = selected ? CircleCheckIcon : CircleIcon;

    function onToggleSegmentSelectedClick(e: MouseEvent) {
        e.stopPropagation();
        seg.toggleSegmentSelected(segment);
    }

    return (
        <div
            className={cn(
                'relative my-px px-1.5 py-1 bg-background transition-opacity border rounded-md',
                isActive ? 'border-muted-foreground' : 'border-transparent',
                !selected && !invertCutSegments && !dragging && 'opacity-50',
            )}
        >
            <div
                {...dragHandleProps}
                className={cn('h-4 text-foreground flex items-center', duration != null && 'mb-0.5')}
                style={{ cursor }}
                onClick={(e) => e.currentTarget.blur()}
                tabIndex={-1}
                role="button"
            >
                <SegmentNumber segment={segment} index={index} isActive={isActive} />
                <span className="whitespace-nowrap" style={{ fontSize: `${Math.min(1, 26 / timeStr.length) * 0.75}em` }}>
                    {timeStr}
                </span>
            </div>

            {'name' in segment && segment.name && (
                <span className="mr-1 text-xs text-primary">
                    {segment.name}
                </span>
            )}
            {Object.entries(tags).map(
                ([name, value]) => (
                    <span key={name} className="mr-0.5 px-0.5 text-[.7em] text-foreground bg-muted rounded-sm">{name}:<b>{value}</b></span>
                )
            )}

            {duration != null && (
                <div className="text-xs">
                    <div>
                        {t('Duration')} {formatTimecode({ seconds: duration, shorten: true })}
                    </div>
                    <div>
                        {t('{{durationMsFormatted}} ms', { durationMsFormatted: Math.floor(duration * 1000) })}
                        <span>
                            , {t('{{frameCount}} frames', { frameCount: (duration && getFrameCount(duration)) ?? '?' })}
                        </span>
                        {estimatedSize != null && (
                            <span className="text-[.9em]">
                                , ~{prettyBytes(estimatedSize, { space: false, maximumFractionDigits: 1, minimumFractionDigits: 0 })}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {!invertCutSegments && selected != null && (
                <CheckIcon className="absolute right-1 bottom-1 size-5 text-foreground cursor-pointer" onClick={onToggleSegmentSelectedClick} />
            )}
        </div>
    );
}

function SegmentNumber({ segment, index, isActive }: { segment: ListSegment; index: number; isActive?: boolean | undefined; }) {
    const invertCutSegments = useAtomValue(invertCutSegmentsAtom);
    const darkMode = useAtomValue(darkModeAtom);
    const getSegColor = useAtomValue(getSegColorAtom);

    if (invertCutSegments || !('segColorIndex' in segment)) {
        return <SaveIcon className="mr-1 size-3.5 text-green-600 dark:text-green-400" />;
    }

    const color = getSegColor(segment).desaturate(0.25).lightness(darkMode ? 35 : 55);
    const borderColor = darkMode ? color.lighten(0.5) : color.darken(0.3);

    return (
        <b
            className="mr-1 -ml-0.5 px-1 text-[.7em] text-white rounded-[.35em]"
            style={{ background: color.string(), border: `.05em solid ${isActive ? borderColor.string() : 'transparent'}` }}
        >
            {index + 1}
        </b>
    );
}

function SegmentContextMenuContent({ segment, index }: { segment: StateSegment; index: number; }) {
    const { t } = useTranslation();

    const items: ({ label: string; click: () => unknown; } | 'separator')[] = [
        { label: t('Jump to start time'), click: () => jumpSegStart(index) },
        { label: t('Jump to end time'), click: () => jumpSegEnd(index) },
        'separator',
        { label: t('Add segment'), click: seg.addSegment },
        { label: t('Label segment'), click: () => seg.labelSegment(index) },
        { label: t('Remove segment'), click: () => seg.removeSegment(index) },
        { label: t('Duplicate segment'), click: () => seg.duplicateSegment(segment) },
        'separator',
        { label: t('Select only this segment'), click: () => seg.selectOnlySegment(segment) },
        { label: t('Select all segments'), click: seg.selectAllSegments },
        { label: t('Deselect all segments'), click: seg.deselectAllSegments },
        { label: t('Select all markers'), click: seg.selectAllMarkers },
        { label: t('Select segments by label'), click: seg.selectSegmentsByLabel },
        { label: t('Select segments by expression'), click: tmcmd_selectSegmentsByExpr },
        { label: t('Invert selected segments'), click: seg.invertSelectedSegments },
        'separator',
        { label: t('Label selected segments'), click: seg.labelSelectedSegments },
        { label: t('Edit segments by expression'), click: tmcmd_mutateSegmentsByExpr },
        { label: t('Extract frames from selected segments as image files'), click: () => runAction('extractSelectedSegmentsFramesAsImages') },
        { label: t('Remove selected segments'), click: seg.removeSelectedSegments },
        'separator',
        { label: t('Change segment order'), click: () => reorderSegmentDialog(index) },
        { label: t('Increase segment order'), click: () => seg.updateSegOrder(index, index + 1) },
        { label: t('Decrease segment order'), click: () => seg.updateSegOrder(index, index - 1) },
        'separator',
        { label: t('Segment tags'), click: () => editSegmentTags(index) },
        { label: t('Extract segment frames as image files'), click: () => { seg.setCurrentSegIndex(index); return runAction('extractCurrentSegmentFramesAsImages'); }, },
    ];

    return (
        <ContextMenuContent className="max-h-[80vh]">
            {items.map(
                (item, i) => (
                    item === 'separator'
                        ? <ContextMenuSeparator key={`sep-${i}`} />
                        : <ContextMenuItem key={item.label} onSelect={() => { void item.click(); }}>{item.label}</ContextMenuItem>
                )
            )}
        </ContextMenuContent>
    );
}
