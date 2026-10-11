import { type ComponentProps, type CSSProperties } from "react";
import { useAtomValue } from "jotai";
import { cn } from "@/utils/classnames";
import { Button } from "@/ui/shadcn/button";
import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon, StepBackIcon, StepForwardIcon } from "lucide-react";
import { Icon_ToFrame, Icon_ToKeyframe } from "@/ui/icons/normal/local-ui";
import { useTranslation } from "react-i18next";

import * as player from "@/editor/3-player/7-actions/player-actions";
import { formatTimecodeAtom, getFrameCountAtom } from "@/editor/0-core/9-state/timecode";
import { getSegColor as getSegColorRaw } from "@/editor/0-core/8-lib/colors";
import { fileDurationNonZeroAtom, isFileOpenedAtom } from "@/editor/2-file/9-state/a-file-atoms";
import { playbackModeAtom, playingAtom } from "@/editor/3-player/9-state/a-player-atoms";
import { currentCutSegAtom, selectedSegmentsAtom } from "@/editor/5-segments/9-state/a-segments-store";
import { simpleModeAtom } from "@/editor/5-segments/9-state/a-seg-ui-atoms";
import { setCutEnd, setCutStart } from "@/editor/5-segments/7-actions/segment-actions";
import { actionTitleAtom } from "../../9-state/action-title";
import { currentFrameAtom, displayTimeAtom, isZoomedAtom, keyframesEnabledAtom } from "../../9-state/timeline-atoms";
import { seekClosestKeyframe } from "../../7-actions/3-timeline-actions";
import { Control_CutTime } from "./1-input-cut-time";
import { Button_JumpSegment, Button_SegmentCutpoint } from "./2-button-segment-cut";

// Port of upstream BottomBar.tsx

export function Bar_Playback() {
    return (
        <div className="shrink-0 bg-muted transition-[background] duration-500 border-t">
            <BottomBarTopRow />
            <BottomBarBottomRow />
        </div>
    );
}

function BottomBarTopRow() {
    const isFileOpened = useAtomValue(isFileOpenedAtom);
    const keyframesEnabled = useAtomValue(keyframesEnabledAtom);
    const simpleMode = useAtomValue(simpleModeAtom);
    const currentCutSeg = useAtomValue(currentCutSegAtom);
    const actionTitle = useAtomValue(actionTitleAtom);
    const { t } = useTranslation();

    return (
        <div className={cn('select-none flex items-center justify-center', !isFileOpened && 'opacity-50')}>
            {/* --------- Left side --------- */}
            <Controls_TimelineEdge direction={-1} simpleMode={simpleMode} />
            <Control_CutTime side="start" currentCutSeg={currentCutSeg ?? { segColorIndex: 0 }} onSetCut={setCutStart} title={actionTitle(t('Start current segment at current time'), 'setCutStart')} />
            <Button_KeyframeSeek direction={-1} keyframesEnabled={keyframesEnabled} />
            <Button_FrameStep direction={-1} simpleMode={simpleMode} />

            {/* --------- Center --------- */}
            <Button_PlayPause />

            {/* --------- Right side --------- */}
            <Button_FrameStep direction={1} simpleMode={simpleMode} />
            <Button_KeyframeSeek direction={1} keyframesEnabled={keyframesEnabled} />
            <Control_CutTime side="end" currentCutSeg={currentCutSeg} onSetCut={setCutEnd} title={actionTitle(t('End current segment at current time'), 'setCutEnd')} />
            <Controls_TimelineEdge direction={1} simpleMode={simpleMode} />
        </div>
    );
}

/** Jump-to-edge, neighboring segment, and current-segment cutpoint. Start order is mirrored for the end. */
function Controls_TimelineEdge({ direction, simpleMode }: { direction: -1 | 1; simpleMode: boolean; }) {
    const currentCutSeg = useAtomValue(currentCutSegAtom);
    const actionTitle = useAtomValue(actionTitleAtom);
    const { t } = useTranslation();

    const start = direction < 0;

    if (simpleMode) {
        return null;
    }

    const jumpTimeline = (
        <Button_Bar
            title={actionTitle(t(start ? 'Jump to start of video' : 'Jump to end of video'), start ? 'jumpTimelineStart' : 'jumpTimelineEnd')}
            onClick={start ? player.jumpTimelineStart : player.jumpTimelineEnd}
        >
            {start ? <SkipBackIcon className="size-4" /> : <SkipForwardIcon className="size-4" />}
        </Button_Bar>
    );

    const cutpoint = (
        <Button_SegmentCutpoint
            className={start ? 'mr-1.25' : 'ml-1.25'}
            currentCutSeg={currentCutSeg}
            side={start ? 'start' : 'end'}
            Icon={start ? StepBackIcon : StepForwardIcon}
            onClick={start ? player.jumpCutStart : player.jumpCutEnd}
            title={actionTitle(t(start ? 'Jump to current segment\'s start time' : 'Jump to current segment\'s end time'), start ? 'jumpCutStart' : 'jumpCutEnd')}
        />
    );

    return (<>
        {start ? jumpTimeline : cutpoint}
        <Button_JumpSegment direction={direction} />
        {start ? cutpoint : jumpTimeline}
    </>);
}

function Button_FrameStep({ direction, simpleMode }: { direction: -1 | 1; simpleMode: boolean; }) {
    const actionTitle = useAtomValue(actionTitleAtom);
    const { t } = useTranslation();
    const prev = direction < 0;

    if (simpleMode) {
        return null;
    }

    return (
        <Button_Bar
            title={actionTitle(t(prev ? 'One frame back' : 'One frame forward'), prev ? 'seekPreviousFrame' : 'seekNextFrame')}
            onClick={() => player.shortStep(direction)}
        >
            <Icon_ToFrame className={cn('size-5 stroke-2!', !prev && '-scale-x-100')} />
        </Button_Bar>
    );
}

function Button_KeyframeSeek({ direction, keyframesEnabled }: { direction: -1 | 1; keyframesEnabled: boolean; }) {
    const currentFrame = useAtomValue(currentFrameAtom);
    const actionTitle = useAtomValue(actionTitleAtom);
    const { t } = useTranslation();
    const prev = direction < 0;

    if (!keyframesEnabled) {
        return null;
    }

    return (
        <Button_Bar
            className={cn(!prev && "-scale-x-100", currentFrame?.keyframe && activeClasses)}
            onClick={() => seekClosestKeyframe(direction)}
            title={prev ? actionTitle(t("Seek previous keyframe"), "seekBackwardsKeyframe") : actionTitle(t("Seek next keyframe"), "seekForwardsKeyframe")}
        >
            <Icon_ToKeyframe className="size-5 stroke-2!" />
        </Button_Bar>
    );
}

const activeClasses = "text-primary";

function Button_PlayPause() {
    const playing = useAtomValue(playingAtom);
    const actionTitle = useAtomValue(actionTitleAtom);
    const { t } = useTranslation();
    const Icon = playing ? PauseIcon : PlayIcon;
    return (
        <div
            className="size-4 rounded-full flex items-center justify-center"
            onClick={() => player.togglePlay()}
            title={actionTitle(t('Play/pause'), 'togglePlayResetSpeed')}
            role="button"
        >
            <Icon className="size-3.5" />
        </div>
    );
}

//---------------------------------------------------------------------------

function BottomBarBottomRow() {
    const isFileOpened = useAtomValue(isFileOpenedAtom);

    return (
        <div className="relative px-1 py-0.5 h-8 flex items-center justify-end gap-2">
            <Indicator_DisplayTime />
            {isFileOpened && <Button_LoopSelectedSegments />}
        </div>
    );
}

/** High frequency (follows the playhead): keep it a leaf */
function Indicator_DisplayTime() {
    const displayTime = useAtomValue(displayTimeAtom);
    const formatTimecode = useAtomValue(formatTimecodeAtom);
    const getFrameCount = useAtomValue(getFrameCountAtom);
    const isZoomed = useAtomValue(isZoomedAtom);
    const fileDurationNonZero = useAtomValue(fileDurationNonZeroAtom);

    return (
        <div className="absolute inset-0 ml-6 flex items-center justify-center pointer-events-none">
            <div className="font-mono tracking-[-0.08em] pointer-events-auto">
                {formatTimecode({ seconds: displayTime })}

                <span className="inline-block ml-2 min-w-[3.5em]">
                    {getFrameCount(displayTime) ?? 0}
                    <span className="opacity-50 select-none">
                        f
                    </span>
                    {isZoomed && (
                        <span className="ml-2">
                            {Math.round((displayTime / fileDurationNonZero) * 100)}
                            <span className="opacity-50 select-none">
                                %
                            </span>
                        </span>
                    )}
                </span>
            </div>
        </div>
    );
}

//---------------------------------------------------------------------------

function Button_LoopSelectedSegments() {
    const selectedSegments = useAtomValue(selectedSegmentsAtom);
    const playing = useAtomValue(playingAtom);
    const playbackMode = useAtomValue(playbackModeAtom);
    const actionTitle = useAtomValue(actionTitleAtom);
    const { t } = useTranslation();

    // need at least 2 gradient elements:
    const selectedSegmentsSafe = (
        selectedSegments.length >= 2
            ? selectedSegments
            : [selectedSegments[0] ?? { segColorIndex: 0 }, selectedSegments[1] ?? { segColorIndex: 1 }]
    ).slice(0, 10);

    const gradientColors = selectedSegmentsSafe.map((seg, i) => {
        const segColor = getSegColorRaw(seg);
        // make colors stronger, the more segments
        return `${segColor.alpha(Math.max(0.4, Math.min(0.8, selectedSegmentsSafe.length / 3))).string()} ${((i / (selectedSegmentsSafe.length - 1)) * 100).toFixed(1)}%`;
    }).join(', ');

    const style: CSSProperties = { background: `linear-gradient(90deg, ${gradientColors})` };
    const Icon = playing && (playbackMode === 'play-selected-segments' || playbackMode === 'loop-selected-segments') ? PauseIcon : PlayIcon;

    return (
        <div
            className={cn('text-[.7em] border border-muted-foreground', "size-4 rounded-full flex items-center justify-center")}
            style={style}
            onClick={player.toggleLoopSelectedSegments}
            title={actionTitle(t('Play selected segments in order'), 'toggleLoopSelectedSegments')}
            role="button"
        >
            <Icon className="size-3 fill-current" />
        </div>
    );
}

function Button_Bar({ className, ...rest }: ComponentProps<'button'>) {
    return (
        <Button
            className={cn('hover:bg-background hover:text-foreground rounded cursor-pointer', className)}
            variant="outline"
            size="icon-sm"
            type="button"
            {...rest}
        />
    );
}
