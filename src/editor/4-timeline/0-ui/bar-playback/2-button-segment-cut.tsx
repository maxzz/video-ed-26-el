import { type ComponentType } from "react";
import { useAtomValue } from "jotai";
import { cn } from "@/utils/classnames";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon, PointerIcon } from "lucide-react";
import { PopoverAnchor, PopoverTrigger } from "@/ui/shadcn/popover";

import { type SegmentColorIndex } from "@/editor/0-core/8-lib/9-types-core";
import { currentSegIndexSafeAtom, cutSegmentsAtom } from "@/editor/5-segments/9-state/a-segments-store";
import { darkModeAtom, getSegColorAtom } from "@/editor/5-segments/9-state/a-seg-ui-atoms";
import { setCurrentSegIndex } from "@/editor/5-segments/7-actions/segment-actions";
import { type Side } from "./9-types-playbar";

// Ports of upstream SegmentCutpointButton, SetCutpointButton and BottomBar renderJumpCutpointButton

export function Button_SegmentCutpoint({ currentCutSeg, side, Icon, onClick, title, className }: {
    currentCutSeg: SegmentColorIndex | undefined;
    side: Side;
    Icon: ComponentType<{ className?: string; }>;
    onClick: () => unknown;
    title: string;
    className?: string;
}) {
    const darkMode = useAtomValue(darkModeAtom);
    const getSegColor = useAtomValue(getSegColorAtom);

    const start = side === 'start';
    const { border, backgroundColor } = cutpointColors(currentCutSeg, darkMode, getSegColor);

    return (
        <button
            className={cn('shrink-0 py-1 text-white rounded-md cursor-pointer', start ? 'pr-1 pl-0.5' : 'pr-0.5 pl-1', className)}
            style={{ borderLeft: start ? border : undefined, borderRight: !start ? border : undefined, backgroundColor }}
            onClick={() => { void onClick(); }}
            title={title}
            type="button"
        >
            <Icon className="size-3.25" />
        </button>
    );
}

/** Constant side because we are mirroring. `popover` adds the down arrow that opens the time popup. */
export function Button_SetCutpoint({ currentCutSeg, side, onClick, title, className, revealed, revealTitle, popover }: {
    currentCutSeg: SegmentColorIndex | undefined;
    side: Side;
    onClick: () => unknown;
    title: string;
    className?: string;
    revealed?: boolean;
    revealTitle?: string;
    popover?: boolean;
}) {
    if (!popover) {
        return <Button_SegmentCutpoint currentCutSeg={currentCutSeg} side="end" Icon={PointerIcon} onClick={onClick} title={title} className={cn(side === 'start' && '-scale-x-100', className)} />;
    }

    return (
        <Split_SetCutpoint
            currentCutSeg={currentCutSeg}
            side={side}
            onClick={onClick}
            title={title}
            className={className}
            revealed={revealed ?? false}
            revealTitle={revealTitle ?? title}
        />
    );
}

function Split_SetCutpoint({ currentCutSeg, side, onClick, title, className, revealed, revealTitle }: {
    currentCutSeg: SegmentColorIndex | undefined;
    side: Side;
    onClick: () => unknown;
    title: string;
    className?: string;
    revealed: boolean;
    revealTitle: string;
}) {
    const darkMode = useAtomValue(darkModeAtom);
    const getSegColor = useAtomValue(getSegColorAtom);
    const { border, backgroundColor } = cutpointColors(currentCutSeg, darkMode, getSegColor);
    const isStart = side === 'start';

    const pointer = (
        <button type="button" className="py-1 pr-0.5 pl-1 outline-none focus:outline-none focus-visible:outline-none flex items-center cursor-pointer" onClick={() => { void onClick(); }} title={title} tabIndex={-1}>
            <PointerIcon className={cn('size-3.25', isStart && '-scale-x-100')} />
        </button>
    );

    const chevron = (
        <PopoverTrigger asChild>
            <button type="button" className="py-1 pr-1 pl-0.5 outline-none focus:outline-none focus-visible:outline-none flex items-center cursor-pointer" title={revealTitle} tabIndex={-1}>
                <ChevronDownIcon className={cn('size-3 transition-transform', revealed && 'rotate-180')} />
            </button>
        </PopoverTrigger>
    );

    return (
        <PopoverAnchor asChild>
            <div
                className={cn('shrink-0 text-white rounded shadow flex items-stretch', className)}
                style={{ backgroundColor, borderLeft: isStart ? border : undefined, borderRight: isStart ? undefined : border }}
            >
                {pointer}
                {chevron}
            </div>
        </PopoverAnchor>
    );
}

function cutpointColors(currentCutSeg: SegmentColorIndex | undefined, darkMode: boolean, getSegColor: ReturnType<typeof useAtomValue<typeof getSegColorAtom>>) {
    const segColor = getSegColor(currentCutSeg);
    return {
        border: `3px solid ${segColor.desaturate(0.6).lightness(darkMode ? 45 : 35).string()}`,
        backgroundColor: segColor.desaturate(0.6).lightness(darkMode ? 35 : 55).string(),
    };
}

export function Button_JumpSegment({ direction }: { direction: -1 | 1; }) {
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
            className={cn('whitespace-nowrap mx-1.5 py-1.5 w-5 font-bold text-center rounded-[10px] leading-2.5 tracking-[-1px]', seg ? 'text-white' : 'opacity-50')}
            style={{
                backgroundColor: seg && getSegColor(seg).desaturate(0.6).lightness(darkMode ? 35 : 55).string(),
                fontSize: text.length === 1 ? 14 : (text.length === 2 ? 12 : 10),
            }}
            onClick={() => { if (seg) setCurrentSegIndex(newIndex); }}
            title={`${direction > 0 ? t('Select next segment') : t('Select previous segment')} (${newIndex + 1})`}
            role="button"
        >
            {text}
        </div>
    );
}
