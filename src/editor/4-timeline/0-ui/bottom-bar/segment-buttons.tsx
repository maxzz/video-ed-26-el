import type { ComponentType } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import { PointerIcon } from 'lucide-react';
import { cn } from '@/utils/classnames';
import type { SegmentColorIndex } from '@/editor/0-core/8-lib/9-types-core';
import { currentSegIndexSafeAtom, cutSegmentsAtom } from '@/editor/5-segments/9-state/segments-store.ts';
import { darkModeAtom, getSegColorAtom } from '@/editor/5-segments/9-state/seg-ui-atoms.ts';
import { setCurrentSegIndex } from '@/editor/5-segments/7-actions/segment-actions.ts';

// Ports of upstream SegmentCutpointButton, SetCutpointButton and BottomBar renderJumpCutpointButton

export function SegmentCutpointButton({ currentCutSeg, side, Icon, onClick, title, className }: {
    currentCutSeg: SegmentColorIndex | undefined;
    side: 'start' | 'end';
    Icon: ComponentType<{ className?: string; }>;
    onClick: () => unknown;
    title: string;
    className?: string;
}) {
    const darkMode = useAtomValue(darkModeAtom);
    const getSegColor = useAtomValue(getSegColorAtom);
    const segColor = getSegColor(currentCutSeg);

    const start = side === 'start';
    const border = `3px solid ${segColor.desaturate(0.6).lightness(darkMode ? 45 : 35).string()}`;
    const backgroundColor = segColor.desaturate(0.6).lightness(darkMode ? 35 : 55).string();

    return (
        <button
            type="button"
            title={title}
            className={cn('shrink-0 py-1 text-white rounded-md cursor-pointer', start ? 'pr-1 pl-0.5' : 'pr-0.5 pl-1', className)}
            style={{ borderLeft: start ? border : undefined, borderRight: !start ? border : undefined, backgroundColor }}
            onClick={() => { void onClick(); }}
        >
            <Icon className="size-3.25" />
        </button>
    );
}

/** Constant side because we are mirroring */
export function SetCutpointButton({ currentCutSeg, side, onClick, title, className }: {
    currentCutSeg: SegmentColorIndex | undefined;
    side: 'start' | 'end';
    onClick: () => unknown;
    title: string;
    className?: string;
}) {
    return <SegmentCutpointButton currentCutSeg={currentCutSeg} side="end" Icon={PointerIcon} onClick={onClick} title={title} className={cn(side === 'start' && '-scale-x-100', className)} />;
}

export function JumpSegmentButton({ direction }: { direction: -1 | 1; }) {
    const { t } = useTranslation();
    const cutSegments = useAtomValue(cutSegmentsAtom);
    const currentSegIndexSafe = useAtomValue(currentSegIndexSafeAtom);
    const darkMode = useAtomValue(darkModeAtom);
    const getSegColor = useAtomValue(getSegColorAtom);

    const newIndex = currentSegIndexSafe + direction;
    const seg = cutSegments[newIndex];
    const text = seg ? `${newIndex + 1}` : '-';

    return (
        <div
            role="button"
            className={cn('whitespace-nowrap mx-1.5 py-1.5 w-5 font-bold text-center rounded-[10px] leading-2.5 tracking-[-1px]', seg ? 'text-white' : 'opacity-50')}
            style={{
                backgroundColor: seg && getSegColor(seg).desaturate(0.6).lightness(darkMode ? 35 : 55).string(),
                fontSize: text.length === 1 ? 14 : (text.length === 2 ? 12 : 10),
            }}
            title={`${direction > 0 ? t('Select next segment') : t('Select previous segment')} (${newIndex + 1})`}
            onClick={() => { if (seg) setCurrentSegIndex(newIndex); }}
        >
            {text}
        </div>
    );
}
