import { useAtomValue } from 'jotai';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { TriangleIcon } from 'lucide-react';
import { Button } from '@/ui/shadcn/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/ui/shadcn/context-menu';
import { cn } from '@/utils/classnames';
import type { RenderableWaveform } from '@/editor/0-core/8-lib/types.ts';
import { userSettingsAtom } from '@/editor/0-core/9-state/user-settings.ts';
import { calculateTimelinePercent } from '@/editor/0-core/8-lib/util.ts';
import { fileDurationNonZeroAtom } from '@/editor/2-file/9-state/a-file-atoms.ts';
import { commandedTimeAtom, playerTimeAtom } from '@/editor/3-player/9-state/player-atoms.ts';
import { darkModeAtom, springAnimationAtom } from '@/editor/5-segments/9-state/seg-ui-atoms.ts';
import {
    keyFramesInZoomWindowAtom, overviewWaveformAtom, shouldShowKeyframesAtom, shouldShowWaveformAtom, showThumbnailsAtom,
    thumbnailsSortedAtom, waveformEnabledAtom, waveformsAtom, zoomAtom,
} from '../../9-state/timeline-atoms.ts';
import { onTimelineWheel } from '../../7-actions/timeline-actions.ts';
import { goToTimecode } from '@/editor/3-player/7-actions/video-events.ts';
import { generateOverviewWaveform } from '../../7-actions/waveform.ts';
import { onTimelineMouseDown, onTimelineMouseMove, onTimelineMouseOut, onTimelineScroll, timelineScrollerRef, timelineWrapperRef } from '../../7-actions/timeline-scroll.ts';
import { BetweenSegmentsList, TimelineSegments } from '../timeline-seg.tsx';

// Port of upstream Timeline.tsx. Leaf components subscribe to their own atoms so the time markers don't re-render the whole timeline

export function Timeline() {
    const { t } = useTranslation();
    return (
        <div
            className="relative shrink-0 select-none border-y"
            onMouseDown={onTimelineMouseDown}
            onMouseMove={onTimelineMouseMove}
            onMouseOut={onTimelineMouseOut}
        >
            <WaveformNotice />

            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div>
                        <div
                            ref={timelineScrollerRef}
                            className="scrollbar-none overflow-x-scroll overflow-y-hidden"
                            onWheel={onTimelineWheel}
                            onScroll={onTimelineScroll}
                        >
                            <TimelineWaveforms />
                            <TimelineThumbnails />
                            <TimelineTrack />
                        </div>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onSelect={() => { void goToTimecode(); }}>{t('Seek to timecode')}</ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        </div>
    );
}

function WaveformNotice() {
    const { t } = useTranslation();
    const waveformEnabled = useAtomValue(waveformEnabledAtom);
    const shouldShowWaveform = useAtomValue(shouldShowWaveformAtom);
    if (!waveformEnabled || shouldShowWaveform) return null;
    return (
        <div className="h-9 text-sm text-muted-foreground flex items-center justify-center gap-2">
            {t('Zoom in more to view waveform')}
            <Button size="xs" variant="outline" onMouseDown={(e) => e.stopPropagation()} onClick={() => { void generateOverviewWaveform(); }}>
                {t('Load overview')}
            </Button>
        </div>
    );
}

function TimelineWaveforms() {
    const waveformEnabled = useAtomValue(waveformEnabledAtom);
    const shouldShowWaveform = useAtomValue(shouldShowWaveformAtom);
    const waveforms = useAtomValue(waveformsAtom);
    const overviewWaveform = useAtomValue(overviewWaveformAtom);
    const zoom = useAtomValue(zoomAtom);
    const { waveformHeight } = useAtomValue(userSettingsAtom);

    if (!waveformEnabled || !shouldShowWaveform || (waveforms.length === 0 && overviewWaveform == null)) return null;

    return (
        <div className="relative bg-timeline-track" style={{ height: waveformHeight, width: `${zoom * 100}%` }}>
            {zoom === 1 && overviewWaveform != null
                ? <WaveformImage waveform={overviewWaveform} />
                : waveforms.map((waveform) => <WaveformImage key={`${waveform.from}-${waveform.to}`} waveform={waveform} />)}
        </div>
    );
}

function WaveformImage({ waveform }: { waveform: RenderableWaveform; }) {
    const fileDurationNonZero = useAtomValue(fileDurationNonZeroAtom);
    const darkMode = useAtomValue(darkModeAtom);

    const left = 'from' in waveform ? calculateTimelinePercent(waveform.from, fileDurationNonZero) : '0%';
    const width = 'to' in waveform ? ((Math.min(waveform.to, fileDurationNonZero) - waveform.from) / fileDurationNonZero) * 100 : 100;
    const style = { left, width: `${width}%` };

    if (waveform.url == null) {
        return <div className="absolute h-full bg-muted-foreground/20 animate-pulse pointer-events-none" style={style} />;
    }

    return (
        <img
            src={waveform.url}
            draggable={false}
            alt=""
            className={cn('absolute h-full [image-rendering:pixelated] pointer-events-none', !darkMode && 'invert')}
            style={style}
        />
    );
}

function TimelineThumbnails() {
    const showThumbnails = useAtomValue(showThumbnailsAtom);
    const thumbnails = useAtomValue(thumbnailsSortedAtom);
    const fileDurationNonZero = useAtomValue(fileDurationNonZeroAtom);
    const zoom = useAtomValue(zoomAtom);

    if (!showThumbnails) return null;

    return (
        <div className="relative mb-0.75 h-15" style={{ width: `${zoom * 100}%` }}>
            {thumbnails.map((thumbnail, i) => {
                const leftPercent = (thumbnail.time / fileDurationNonZero) * 100;
                const nextThumbTime = thumbnails[i + 1]?.time ?? fileDurationNonZero;
                const maxWidthPercent = ((nextThumbTime - thumbnail.time) / fileDurationNonZero) * 100 * 0.9;
                return (
                    <img
                        key={thumbnail.url}
                        src={thumbnail.url}
                        alt=""
                        className="absolute h-full object-cover border border-white/50 rounded-[15px] rounded-bl-none pointer-events-none"
                        style={{ left: `${leftPercent}%`, maxWidth: `${maxWidthPercent}%` }}
                    />
                );
            })}
        </div>
    );
}

function TimelineTrack() {
    const zoom = useAtomValue(zoomAtom);
    return (
        <div ref={timelineWrapperRef} className="relative h-9 bg-timeline-track transition-[background-color] duration-500" style={{ width: `${zoom * 100}%` }}>
            <BetweenSegmentsList />
            <TimelineSegments />
            <TimelineKeyframes />
            <PlayerTimeMarker />
            <CommandedTimeMarker />
        </div>
    );
}

function TimelineKeyframes() {
    const shouldShowKeyframes = useAtomValue(shouldShowKeyframesAtom);
    const keyFramesInZoomWindow = useAtomValue(keyFramesInZoomWindowAtom);
    const fileDurationNonZero = useAtomValue(fileDurationNonZeroAtom);
    const zoom = useAtomValue(zoomAtom);

    // Don't show keyframes if too packed together (at current zoom). See https://github.com/mifi/lossless-cut/issues/259
    const areKeyframesTooClose = keyFramesInZoomWindow.length > zoom * 200;
    if (!shouldShowKeyframes || areKeyframesTooClose) return null;

    return keyFramesInZoomWindow.map((f) => (
        <div
            key={f.time}
            className="absolute inset-y-0 -ml-px w-px bg-muted-foreground pointer-events-none"
            style={{ left: `${(f.time / fileDurationNonZero) * 100}%` }}
        />
    ));
}

function PlayerTimeMarker() {
    const playerTime = useAtomValue(playerTimeAtom);
    const fileDurationNonZero = useAtomValue(fileDurationNonZeroAtom);
    const springAnimation = useAtomValue(springAnimationAtom);
    const currentTimePercent = calculateTimelinePercent(playerTime, fileDurationNonZero);
    if (currentTimePercent === undefined) return null;
    return (
        <motion.div
            className="absolute inset-y-0 w-px bg-foreground pointer-events-none"
            transition={springAnimation}
            animate={{ left: currentTimePercent }}
        />
    );
}

function CommandedTimeMarker() {
    const commandedTime = useAtomValue(commandedTimeAtom);
    const fileDurationNonZero = useAtomValue(fileDurationNonZeroAtom);
    const commandedTimePercent = calculateTimelinePercent(commandedTime, fileDurationNonZero);
    if (commandedTimePercent === undefined) return null;
    return (
        <>
            <TriangleIcon className="absolute top-0 -mt-1.5 -ml-1.75 size-3.5 text-foreground fill-current rotate-180 pointer-events-none" style={{ left: commandedTimePercent }} />
            <div className="absolute inset-y-0 w-px bg-foreground pointer-events-none" style={{ left: commandedTimePercent }} />
            <TriangleIcon className="absolute bottom-0 -mb-1.25 -ml-1.75 size-3.5 text-foreground fill-current pointer-events-none" style={{ left: commandedTimePercent }} />
        </>
    );
}
