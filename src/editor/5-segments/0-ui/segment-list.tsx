import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { motion } from 'motion/react';
import { Trans, useTranslation } from 'react-i18next';
import { closestCenter, DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown01Icon, CircleCheckIcon, ContrastIcon, MinusIcon, PlusIcon, SplitIcon, TagIcon, XIcon } from 'lucide-react';
import { cn } from '@/utils/classnames';
import type { SegmentColorIndex } from '@/editor/0-core/8-lib/types.ts';
import { appStore } from '@/components/4-dialogs/7-0-dialogs/store.ts';
import { formatTimecodeAtom } from '@/editor/0-core/9-state/timecode.ts';
import { rightBarWidth } from '@/editor/0-core/8-lib/constants.ts';
import { runAction } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { actionTitleAtom } from '@/editor/4-timeline/9-state/action-title.ts';
import { currentSegIndexSafeAtom, cutSegmentsAtom } from '../9-state/segments-store.ts';
import {
    darkModeAtom, draggingSegIdAtom, firstSegmentAtCursorAtom, getSegColorAtom, invertCutSegmentsAtom, isOnlyMarkersAtom,
    nextSegColorIndexAtom, segmentListItemsAtom, selectedSegmentsTotalAtom, simpleModeAtom, springAnimationAtom,
} from '../9-state/seg-ui-atoms.ts';
import * as seg from '../7-actions/segment-actions.ts';
import { reorderSegmentDialog } from '../7-actions/segment-dialogs.tsx';
import { SegmentRowContent, SortableSegmentRow } from './segment-row.tsx';

// Port of upstream SegmentList.tsx (right bar)

export function SegmentList() {
    const springAnimation = useAtomValue(springAnimationAtom);
    return (
        <motion.div
            className="shrink-0 text-muted-foreground bg-muted/50 border-l overflow-hidden flex flex-col"
            style={{ width: rightBarWidth }}
            initial={{ x: rightBarWidth }}
            animate={{ x: 0 }}
            exit={{ x: rightBarWidth }}
            transition={springAnimation}
        >
            <SegmentListHeader />
            <SegmentRows />
            <MarkersNotice />
            <SegmentListFooter />
        </motion.div>
    );
}

function SegmentListHeader() {
    const { t } = useTranslation();
    const items = useAtomValue(segmentListItemsAtom);
    const invertCutSegments = useAtomValue(invertCutSegmentsAtom);
    const isOnlyMarkers = useAtomValue(isOnlyMarkersAtom);
    const actionTitle = useAtomValue(actionTitleAtom);

    let header: ReactNode;
    if (items.length === 0) {
        header = invertCutSegments
            ? <Trans>You have enabled the &quot;invert segments&quot; mode <ContrastIcon className="size-3.5 inline align-middle" /> which will cut away selected segments instead of keeping them. But there is no space between any segments, or at least two segments are overlapping. This would not produce any output. Either make room between segments or click the Yinyang <ContrastIcon className="size-3.5 inline align-middle" /> symbol below to disable this mode. Alternatively you may combine overlapping segments from the menu.</Trans>
            : t('No segments to export.');
    } else if (isOnlyMarkers) {
        header = t('Markers:');
    } else {
        header = t('Segments to export:');
    }

    return (
        <div className="px-2 py-0.5 text-foreground flex items-center justify-between gap-1">
            <span className="text-xs">{header}</span>
            <button
                type="button"
                className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                title={actionTitle(t('Close sidebar'), 'toggleSegmentsList')}
                onClick={() => runAction('toggleSegmentsList')}
            >
                <XIcon className="size-4" />
            </button>
        </div>
    );
}

function SegmentRows() {
    const items = useAtomValue(segmentListItemsAtom);
    const invertCutSegments = useAtomValue(invertCutSegmentsAtom);
    const currentSegIndex = useAtomValue(currentSegIndexSafeAtom);
    const draggingId = useAtomValue(draggingSegIdAtom);
    const scrollerRef = useRef<HTMLDivElement>(null);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }));

    const ids = items.map((s) => s.segId);

    const rowVirtualizer = useVirtualizer({
        count: items.length,
        gap: 7,
        getScrollElement: () => scrollerRef.current,
        estimateSize: () => 66,
        overscan: 5,
        getItemKey: (index) => items[index]!.segId,
    });

    // follow the current segment (the virtualizer instance only exists inside the component)
    useEffect(() => {
        if (invertCutSegments || currentSegIndex < 0) return;
        rowVirtualizer.scrollToIndex(currentSegIndex, { align: 'auto' });
    }, [currentSegIndex, invertCutSegments, rowVirtualizer]);

    function handleDragStart(event: DragStartEvent) {
        appStore.set(draggingSegIdAtom, String(event.active.id));
    }

    function handleDragEnd(event: DragEndEvent) {
        appStore.set(draggingSegIdAtom, undefined);
        const { active, over } = event;
        if (over != null && active.id !== over.id) {
            const oldIndex = ids.indexOf(String(active.id));
            const newIndex = ids.indexOf(String(over.id));
            seg.updateSegOrders(arrayMove(ids, oldIndex, newIndex));
        }
    }

    const draggingIndex = draggingId != null ? ids.indexOf(draggingId) : -1;
    const draggingSeg = draggingIndex >= 0 ? items[draggingIndex] : undefined;

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => appStore.set(draggingSegIdAtom, undefined)} modifiers={[restrictToVerticalAxis]}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <div ref={scrollerRef} className="grow pr-1 pl-2 overflow-x-hidden overflow-y-scroll">
                    <div className="relative overflow-hidden" style={{ height: rowVirtualizer.getTotalSize() }}>
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const segment = items[virtualRow.index]!;
                            const selected = 'selected' in segment ? segment.selected : true;
                            const isActive = !invertCutSegments && currentSegIndex === virtualRow.index;
                            return (
                                <div
                                    key={segment.segId}
                                    ref={rowVirtualizer.measureElement}
                                    className="absolute top-0 left-0 w-full"
                                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                                    data-index={virtualRow.index}
                                >
                                    <SortableSegmentRow segment={segment} index={virtualRow.index} selected={selected} isActive={isActive} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </SortableContext>

            <DragOverlay>
                {draggingSeg ? <SegmentRowContent segment={draggingSeg} index={draggingIndex} selected dragging /> : null}
            </DragOverlay>
        </DndContext>
    );
}

function MarkersNotice() {
    const { t } = useTranslation();
    const isOnlyMarkers = useAtomValue(isOnlyMarkersAtom);
    if (!isOnlyMarkers) return null;
    return (
        <div className="px-3 py-4 text-xs text-muted-foreground">
            {t('Markers are segments without an end time and will not be exported. Convert markers to segments by setting their end time.')}
        </div>
    );
}

const footerButtonClasses = 'mx-1 p-0.5 size-6 text-white rounded-sm cursor-pointer';
const disabledButtonClasses = 'text-muted-foreground bg-muted';

function SegmentListFooter() {
    const { t } = useTranslation();
    const cutSegments = useAtomValue(cutSegmentsAtom);
    const currentSegIndex = useAtomValue(currentSegIndexSafeAtom);
    const firstSegmentAtCursor = useAtomValue(firstSegmentAtCursorAtom);
    const nextSegColorIndex = useAtomValue(nextSegColorIndexAtom);
    const invertCutSegments = useAtomValue(invertCutSegmentsAtom);
    const simpleMode = useAtomValue(simpleModeAtom);
    const darkMode = useAtomValue(darkModeAtom);
    const getSegColor = useAtomValue(getSegColorAtom);
    const actionTitle = useAtomValue(actionTitleAtom);
    const formatTimecode = useAtomValue(formatTimecodeAtom);
    const segmentsTotal = useAtomValue(selectedSegmentsTotalAtom);

    const getButtonColor = (s: SegmentColorIndex | undefined) => getSegColor(s).desaturate(0.3).lightness(darkMode ? 45 : 55).string();
    const currentCutSeg = cutSegments[currentSegIndex];
    const currentSegColor = getButtonColor(currentCutSeg);
    const segAtCursorColor = getButtonColor(firstSegmentAtCursor);
    const nextSegmentColor = getButtonColor({ segColorIndex: nextSegColorIndex });

    const bg = (enabled: boolean, color: string): { className?: string; style?: CSSProperties; } => (enabled ? { style: { backgroundColor: color } } : { className: disabledButtonClasses });

    return (
        <>
            <div className="py-1 border-b flex items-center justify-center">
                <FooterButton title={actionTitle(t('Add segment'), 'addSegment')} style={{ backgroundColor: nextSegmentColor }} onClick={seg.addSegment}>
                    <PlusIcon className="size-full" />
                </FooterButton>

                <FooterButton
                    title={actionTitle(t('Remove cutpoint from segment {{segmentNumber}}', { segmentNumber: currentSegIndex + 1 }), 'removeCurrentCutpoint')}
                    {...bg(cutSegments.length > 0, currentSegColor)}
                    onClick={() => seg.removeSegment(currentSegIndex)}
                >
                    <MinusIcon className="size-full" />
                </FooterButton>

                {!invertCutSegments && !simpleMode && (
                    <>
                        <FooterButton title={actionTitle(t('Change segment order'), 'reorderSegsByStartTime')} {...bg(cutSegments.length >= 2, currentSegColor)} onClick={() => reorderSegmentDialog(currentSegIndex)}>
                            <ArrowDown01Icon className="size-full" />
                        </FooterButton>

                        <FooterButton title={actionTitle(t('Label segment'), 'labelCurrentSegment')} {...bg(cutSegments.length > 0, currentSegColor)} onClick={() => seg.labelSegment(currentSegIndex)}>
                            <TagIcon className="size-full" />
                        </FooterButton>
                    </>
                )}

                <FooterButton title={actionTitle(t('Split segment at cursor'), 'splitCurrentSegment')} {...bg(firstSegmentAtCursor != null, segAtCursorColor)} onClick={seg.splitCurrentSegment}>
                    <SplitIcon className="size-full rotate-90" />
                </FooterButton>

                {!invertCutSegments && (
                    <FooterButton title={actionTitle(t('Invert segment selection'), 'invertSelectedSegments')} className={cutSegments.length > 0 ? 'bg-muted-foreground' : disabledButtonClasses} onClick={seg.invertSelectedSegments}>
                        <CircleCheckIcon className="size-full" />
                    </FooterButton>
                )}
            </div>

            <div className="px-2.5 py-1 text-xs border-b flex justify-between">
                <div>{t('Segments total:')}</div>
                <div>{formatTimecode({ seconds: segmentsTotal })}</div>
            </div>
        </>
    );
}

function FooterButton({ title, className, style, onClick, children }: { title: string; className?: string | undefined; style?: CSSProperties | undefined; onClick: () => unknown; children: ReactNode; }) {
    return (
        <button type="button" title={title} className={cn(footerButtonClasses, className)} style={style} onClick={() => { void onClick(); }}>
            {children}
        </button>
    );
}
