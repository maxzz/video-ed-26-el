import { type DragEvent, type FocusEvent, type SyntheticEvent } from "react";
import { useAtomValue } from "jotai";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { cn } from "@/utils/classnames";
import { Button } from "@/ui/shadcn/button";
import { useTranslation } from "react-i18next";
import { CircleXIcon, MenuIcon, RotateCcwSquareIcon } from "lucide-react";

import { runAction } from "@/editor/0-core/7-actions/kbd-actions";
import { calculateTimelinePercent, mediaSourceQualities } from "@/editor/0-core/8-lib/util";
import { fullscreenAtom } from "@/components/2-main/0-all/a-panels-atoms";
import { showRightBarAtom } from "@/components/2-main/0-all/a-layout-atoms";
import { fileDurationAtom, filePathAtom, hasVideoAtom, isFileOpenedAtom, isRotationSetAtom } from "@/editor/2-file/9-state/a-file-atoms";
import { onFilesDrop } from "@/editor/2-file/7-actions/open-files";
import { bigWaveformEnabledAtom } from "@/editor/4-timeline/9-state/timeline-atoms";
import { onTimelineWheel } from "@/editor/4-timeline/7-actions/timeline-actions";
import { BigWaveform } from "@/editor/4-timeline/0-ui/0-all/3-big-waveform";
import {
    activeSubtitleAtom, compatPlayerEnabledAtom, compatPlayerRequiredAtom, mediaSourceQualityAtom, playbackVolumeAtom, playerTimeAtom,
    shouldShowPlaybackStreamSelectorAtom, videoContainerElementAtom, videoElementAtom,
} from "../9-state/a-player-atoms";
import { handleHideCompatPlayerClick, onSeeked, onStartPlaying, onStopPlaying, onTimeUpdate, onVideoAbort, togglePlay } from "../7-actions/player-actions";
import { incrementMediaSourceQuality, onDurationChange, onVideoError, toggleFullscreenVideo } from "../7-actions/video-events";
import { MediaSourcePlayer } from "./media-source-player";
import { NoFileLoaded } from "./no-file-loaded";
import { PlaybackStreamSelector } from "./playback-stream-selector";
import { VolumeControl } from "./volume-control";

const setVideoElement = (el: HTMLVideoElement | null) => { jotaiDefaultStore.set(videoElementAtom, el); };
const setVideoContainer = (el: HTMLDivElement | null) => { jotaiDefaultStore.set(videoContainerElementAtom, el); };

const handleDurationChange = (e: SyntheticEvent<HTMLVideoElement>) => onDurationChange(e.currentTarget.duration);
const handleTimeUpdate = (e: SyntheticEvent<HTMLVideoElement>) => onTimeUpdate(e.currentTarget.currentTime);
const handleClick = () => togglePlay();
// prevent video element from stealing focus in fullscreen mode https://github.com/mifi/lossless-cut/issues/543#issuecomment-1868167775
const handleFocus = (e: FocusEvent<HTMLVideoElement>) => e.target.blur();
const preventDefault = (e: DragEvent) => e.preventDefault();

/** The middle part of the editor (also shown in fullscreen): video, compat player, drop zone and player overlays */
export function PlayerView() {
    const isFileOpened = useAtomValue(isFileOpenedAtom);
    const hasVideo = useAtomValue(hasVideoAtom);
    const bigWaveformEnabled = useAtomValue(bigWaveformEnabledAtom);

    return (
        <div ref={setVideoContainer} className="relative min-h-0 bg-background overflow-hidden flex-1" onDragOver={preventDefault} onDrop={onFilesDrop}>
            {!isFileOpened && <NoFileLoaded />}

            <div className={cn('absolute inset-0 select-none', (!isFileOpened || !hasVideo || bigWaveformEnabled) && 'invisible')} onWheel={onTimelineWheel}>
                <VideoElement />
                <CompatPlayer />
            </div>

            {isFileOpened && bigWaveformEnabled && (
                <div className="absolute inset-0">
                    <BigWaveform />
                </div>
            )}

            <CompatPlayerBanner />

            {isFileOpened && <PlayerControls />}

            <FullscreenProgress />
        </div>
    );
}

function VideoElement() {
    const playbackVolume = useAtomValue(playbackVolumeAtom);
    const compatPlayerEnabled = useAtomValue(compatPlayerEnabledAtom);
    const activeSubtitle = useAtomValue(activeSubtitleAtom);
    return (
        <video
            ref={setVideoElement}
            className="size-full object-contain [&::-webkit-media-controls]:hidden [&::cue]:bg-black/30 [&::-webkit-media-text-track-display]:overflow-visible"
            tabIndex={-1}
            muted={playbackVolume === 0 || compatPlayerEnabled}
            onPlay={onStartPlaying}
            onPause={onStopPlaying}
            onAbort={onVideoAbort}
            onDurationChange={handleDurationChange}
            onTimeUpdate={handleTimeUpdate}
            onError={onVideoError}
            onClick={handleClick}
            onDoubleClick={toggleFullscreenVideo}
            onFocusCapture={handleFocus}
            onSeeked={onSeeked}
        >
            {activeSubtitle && <track default kind="subtitles" label={activeSubtitle.lang} srcLang="en" src={activeSubtitle.url} />}
        </video>
    );
}

function CompatPlayer() {
    const filePath = useAtomValue(filePathAtom);
    const compatPlayerEnabled = useAtomValue(compatPlayerEnabledAtom);
    if (filePath == null || !compatPlayerEnabled) return null;
    return <MediaSourcePlayer />;
}

function CompatPlayerBanner() {
    const { t } = useTranslation();
    const compatPlayerEnabled = useAtomValue(compatPlayerEnabledAtom);
    const compatPlayerRequired = useAtomValue(compatPlayerRequiredAtom);
    const isRotationSet = useAtomValue(isRotationSetAtom);
    const mediaSourceQuality = useAtomValue(mediaSourceQualityAtom);
    if (!compatPlayerEnabled) return null;

    return (
        <div className="absolute top-0 left-0 right-0 mt-3 ml-3 text-sm text-foreground/70 flex items-center gap-1 pointer-events-none">
            {isRotationSet ? (<>
                <RotateCcwSquareIcon className="size-5" />
                {t('Rotation preview')}
            </>) : t('FFmpeg-assisted playback')}

            <Button variant="ghost" size="xs" className="text-foreground/70 pointer-events-auto" title={t('Select playback quality')} onClick={incrementMediaSourceQuality}>
                {mediaSourceQualities[mediaSourceQuality]}
            </Button>

            {!compatPlayerRequired && (
                <Button variant="ghost" size="icon-xs" className="text-foreground/70 pointer-events-auto" onClick={handleHideCompatPlayerClick}>
                    <CircleXIcon />
                </Button>
            )}
        </div>
    );
}

function PlayerControls() {
    const { t } = useTranslation();
    const shouldShowPlaybackStreamSelector = useAtomValue(shouldShowPlaybackStreamSelectorAtom);
    const showRightBar = useAtomValue(showRightBarAtom);
    return (
        <div className="absolute right-0 bottom-0 select-none mb-2.5 mr-1 flex items-end gap-0.5">
            <VolumeControl />

            {shouldShowPlaybackStreamSelector && <PlaybackStreamSelector />}

            {!showRightBar && (
                <Button variant="ghost" size="icon" className="text-foreground/70" title={t('Show sidebar')} onClick={() => runAction('toggleSegmentsList')}>
                    <MenuIcon className="size-5" />
                </Button>
            )}
        </div>
    );
}

function FullscreenProgress() {
    const fullscreen = useAtomValue(fullscreenAtom);
    if (!fullscreen) return null;
    return <FullscreenProgressBar />;
}

function FullscreenProgressBar() {
    const playerTime = useAtomValue(playerTimeAtom);
    const fileDuration = useAtomValue(fileDurationAtom);
    return <div className="absolute bottom-0 left-0 h-0.5 bg-red-600" style={{ width: calculateTimelinePercent(playerTime, fileDuration) }} />;
}
