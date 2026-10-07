import { type ComponentProps, type CSSProperties } from "react";
import { useAtomValue } from "jotai";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { cn } from "@/utils/classnames";
import { motion } from "motion/react";
import { Button } from "@/ui/shadcn/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import {
    AudioWaveformIcon, BabyIcon, CameraIcon, ChevronLeftIcon, ChevronRightIcon, ContrastIcon, FileOutputIcon, GaugeIcon, ImagesIcon, KeyIcon,
    KeyRoundIcon, NotebookTextIcon, PauseIcon, PlayIcon, RotateCcwSquareIcon, ScissorsIcon, SkipBackIcon, SkipForwardIcon, StepBackIcon,
    StepForwardIcon, Trash2Icon, TriangleAlertIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { userSettings, userSettingsAtom } from "@/editor/0-core/9-state/user-settings";

import { type CaptureFormat } from "@shared/types";
import { formatTimecodeAtom, getFrameCountAtom } from "@/editor/0-core/9-state/timecode";
import { hasAction, runAction } from "@/editor/0-core/7-actions/kbd-actions";
import { askForPlaybackRate } from "@/components/4-dialogs/7-1-dialogs/13-ask-for-playback-rate";
import { getSegColor as getSegColorRaw } from "@/editor/0-core/8-lib/colors";
import { exportConfirmOpenAtom } from "@/components/2-main/0-all/a-panels-atoms";
import { detectedFpsAtom, fileDurationNonZeroAtom, hasAudioAtom, hasVideoAtom, isFileOpenedAtom, isRotationSetAtom, rotationAtom } from "@/editor/2-file/9-state/a-file-atoms";
import { outputPlaybackRateAtom, playbackModeAtom, playbackRateAtom, playingAtom } from "@/editor/3-player/9-state/a-player-atoms";
import * as player from "@/editor/3-player/7-actions/player-actions";
import { currentCutSegAtom, segmentsToExportAtom, selectedSegmentsAtom } from "@/editor/5-segments/9-state/segments-store";
import { invertCutSegmentsAtom, simpleModeAtom } from "@/editor/5-segments/9-state/seg-ui-atoms";
import { setCutEnd, setCutStart } from "@/editor/5-segments/7-actions/segment-actions";
import { actionTitleAtom } from "../../9-state/action-title";
import { areWeCuttingAtom } from "../../9-state/bottom-bar-atoms";
import { currentFrameAtom, displayTimeAtom, isZoomedAtom, keyframesEnabledAtom, showThumbnailsAtom, waveformModeAtom, zoomAtom } from "../../9-state/timeline-atoms";
import {
    increaseRotation, seekClosestKeyframe, timelineToggleComfortZoom, toggleExportConfirmEnabled, toggleInvertCutSegments, toggleShowKeyframes,
    toggleShowThumbnails, toggleSimpleMode, toggleWaveformMode, zoomAbs,
} from "../../7-actions/3-timeline-actions";
import { Input_CutTime } from "./1-input-cut-time";
import { Button_JumpSegment, Button_SegmentCutpoint, Button_SetCutpoint } from "./2-button-segment-cut";

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
    const { t } = useTranslation();
    const isFileOpened = useAtomValue(isFileOpenedAtom);
    const simpleMode = useAtomValue(simpleModeAtom);
    const keyframesEnabled = useAtomValue(keyframesEnabledAtom);
    const currentCutSeg = useAtomValue(currentCutSegAtom);
    const actionTitle = useAtomValue(actionTitleAtom);

    return (
        <div className={cn('select-none flex items-center justify-between', !isFileOpened && 'opacity-50')}>
            <div className="flex items-center" style={{ flexBasis: leftRightWidth }}>
                {!simpleMode && <ViewToggles />}
            </div>

            <div className="grow" />

            {!simpleMode && (<>
                <Button_Bar title={actionTitle(t('Jump to start of video'), 'jumpTimelineStart')} onClick={player.jumpTimelineStart}>
                    <SkipBackIcon className="size-4" />
                </Button_Bar>

                <Button_JumpSegment direction={-1} />

                <Button_SegmentCutpoint className="mr-1.25" currentCutSeg={currentCutSeg} side="start" Icon={StepBackIcon} onClick={player.jumpCutStart} title={actionTitle(t('Jump to current segment\'s start time'), 'jumpCutStart')} />
            </>)}

            <Button_SetCutpoint className="mr-1.25" currentCutSeg={currentCutSeg ?? { segColorIndex: 0 }} side="start" onClick={setCutStart} title={actionTitle(t('Start current segment at current time'), 'setCutStart')} />

            {!simpleMode && <Input_CutTime side="start" />}

            {keyframesEnabled && <Button_KeyframeSeek direction={-1} />}

            {!simpleMode && (
                <Button_Bar className="-mr-1 -ml-1.5" title={actionTitle(t('One frame back'), 'seekPreviousFrame')} onClick={() => player.shortStep(-1)}>
                    <ChevronLeftIcon className="size-7" />
                </Button_Bar>
            )}

            <Button_PlayPause />

            {!simpleMode && (
                <Button_Bar className="-mr-1.5 -ml-1" title={actionTitle(t('One frame forward'), 'seekNextFrame')} onClick={() => player.shortStep(1)}>
                    <ChevronRightIcon className="size-7" />
                </Button_Bar>
            )}

            {keyframesEnabled && <Button_KeyframeSeek direction={1} />}

            {!simpleMode && <Input_CutTime side="end" />}

            <Button_SetCutpoint className="ml-1.25" currentCutSeg={currentCutSeg} side="end" onClick={setCutEnd} title={actionTitle(t('End current segment at current time'), 'setCutEnd')} />

            {!simpleMode && (<>
                <Button_SegmentCutpoint className="ml-1.25" currentCutSeg={currentCutSeg} side="end" Icon={StepForwardIcon} onClick={player.jumpCutEnd} title={actionTitle(t('Jump to current segment\'s end time'), 'jumpCutEnd')} />

                <Button_JumpSegment direction={1} />

                <Button_Bar title={actionTitle(t('Jump to end of video'), 'jumpTimelineEnd')} onClick={player.jumpTimelineEnd}>
                    <SkipForwardIcon className="size-4" />
                </Button_Bar>
            </>)}

            <div className="grow" />

            <div style={{ flexBasis: leftRightWidth }} />
        </div>
    );
}

const leftRightWidth = 100;

function ViewToggles() {
    const { t } = useTranslation();
    const hasAudio = useAtomValue(hasAudioAtom);
    const hasVideo = useAtomValue(hasVideoAtom);
    const waveformMode = useAtomValue(waveformModeAtom);
    const showThumbnails = useAtomValue(showThumbnailsAtom);
    const keyframesEnabled = useAtomValue(keyframesEnabledAtom);
    const actionTitle = useAtomValue(actionTitleAtom);

    return (<>
        {hasAudio && (
            <Button_Bar className={cn('px-0.5', waveformMode != null && activeClasses)} title={actionTitle(t('Show waveform'), 'toggleWaveformMode')} onClick={toggleWaveformMode}>
                <AudioWaveformIcon className="size-5" />
            </Button_Bar>
        )}

        {hasVideo && (<>
            <Button_Bar className={cn('px-1', showThumbnails && activeClasses)} title={actionTitle(t('Show thumbnails'), 'toggleShowThumbnails')} onClick={toggleShowThumbnails}>
                <ImagesIcon className="size-4" />
            </Button_Bar>
            <Button_Bar className={cn('px-1', keyframesEnabled && activeClasses)} title={actionTitle(t('Show keyframes'), 'toggleShowKeyframes')} onClick={toggleShowKeyframes}>
                <KeyIcon className="size-4" />
            </Button_Bar>
        </>)}
    </>);
}

function Button_KeyframeSeek({ direction }: { direction: -1 | 1; }) {
    const { t } = useTranslation();
    const currentFrame = useAtomValue(currentFrameAtom);
    const actionTitle = useAtomValue(actionTitleAtom);
    const prev = direction < 0;
    return (
        <Button_Bar
            className={cn(prev ? 'mr-0.5 -scale-x-100' : 'ml-0.5', currentFrame?.keyframe && activeClasses)}
            onClick={() => seekClosestKeyframe(direction)}
            title={prev ? actionTitle(t('Seek previous keyframe'), 'seekBackwardsKeyframe') : actionTitle(t('Seek next keyframe'), 'seekForwardsKeyframe')}
        >
            <KeyRoundIcon className="size-5" />
        </Button_Bar>
    );
}

const activeClasses = 'text-primary';

const roundButtonClasses = 'size-[2.3em] text-white rounded-full flex items-center justify-center';

function Button_PlayPause() {
    const playing = useAtomValue(playingAtom);
    const actionTitle = useAtomValue(actionTitleAtom);
    const { t } = useTranslation();
    const Icon = playing ? PauseIcon : PlayIcon;
    return (
        <div
            className={cn('mt-0.5 mr-0.5 ml-1 bg-primary', roundButtonClasses, !playing && 'pl-0.5')}
            onClick={() => player.togglePlay()}
            title={actionTitle(t('Play/pause'), 'togglePlayResetSpeed')}
            role="button"
        >
            <Icon className="size-[.9em] fill-current" />
        </div>
    );
}

//---------------------------------------------------------------------------

function BottomBarBottomRow() {
    const isFileOpened = useAtomValue(isFileOpenedAtom);
    const simpleMode = useAtomValue(simpleModeAtom);
    const hasVideo = useAtomValue(hasVideoAtom);
    const { exportConfirmEnabled } = useAtomValue(userSettingsAtom);
    const actionTitle = useAtomValue(actionTitleAtom);
    const { t } = useTranslation();

    return (
        <div className="relative px-1 py-0.5 h-8 flex items-center justify-between gap-2">
            <Button_InvertCutMode />

            <div className="flex items-center">
                <Button_SimpleMode />
                {simpleMode && (
                    <div role="button" className="ml-1 text-xs cursor-pointer" onClick={toggleSimpleMode}>
                        {t('Toggle advanced view')}
                    </div>
                )}
            </div>

            {isFileOpened && !simpleMode && (<>
                <Button_ZoomControls />
                <Indicator_PlaybackRate />
                <Button_Fps />
            </>)}

            {isFileOpened && !simpleMode && hasVideo && <Button_Rotation />}

            <div className="grow" />

            <Indicator_DisplayTime />

            {!simpleMode && isFileOpened && (
                <Button_Bar className="text-destructive hover:text-destructive" title={actionTitle(t('Close file and clean up'), 'cleanupFilesDialog')} onClick={() => runAction('cleanupFilesDialog')}>
                    <Trash2Icon className="size-4" />
                </Button_Bar>
            )}

            {hasVideo && (
                <div className="whitespace-nowrap flex items-center gap-1">
                    <Button_Bar title={actionTitle(t('Capture frame'), 'captureSnapshot')} onClick={() => runAction('captureSnapshot')}>
                        <CameraIcon className="size-6" />
                    </Button_Bar>
                    {!simpleMode && <Button_CaptureFormat />}
                </div>
            )}

            {isFileOpened && <Button_LoopSelectedSegments />}

            {!exportConfirmEnabled && (
                <span title={t('Export options screen is disabled, and you will not see any important notices or warnings.')}>
                    <TriangleAlertIcon className="ml-1 size-4 text-destructive" />
                </span>
            )}
            {(!simpleMode || !exportConfirmEnabled) && <Button_ToggleExportConfirm />}

            {isFileOpened && <Button_Export />}
        </div>
    );
}

function Button_InvertCutMode() {
    const invertCutSegments = useAtomValue(invertCutSegmentsAtom);
    const { t } = useTranslation();
    return (
        <motion.div animate={{ rotateX: invertCutSegments ? 0 : 180 }} transition={{ duration: 0.3 }}>
            <Button_Bar
                className={cn('block', invertCutSegments && 'text-destructive')}
                title={invertCutSegments ? t('Discard selected segments') : t('Keep selected segments')}
                onClick={toggleInvertCutSegments}
            >
                <ContrastIcon className="size-6" />
            </Button_Bar>
        </motion.div>
    );
}

function Button_SimpleMode() {
    const simpleMode = useAtomValue(simpleModeAtom);
    const { t } = useTranslation();
    return (
        <Button_Bar className={simpleMode ? activeClasses : 'text-foreground'} title={t('Toggle advanced view')} onClick={toggleSimpleMode}>
            <BabyIcon className="size-5" />
        </Button_Bar>
    );
}

function Button_ZoomControls() {
    const zoom = useAtomValue(zoomAtom);
    const { t } = useTranslation();
    return (<>
        <div className="cursor-pointer" title={t('Zoom')} onClick={timelineToggleComfortZoom} role="button">
            {zoom}x
        </div>

        <Select value={zoomOptions.includes(zoom) ? String(zoom) : ''} onValueChange={(v) => zoomAbs(() => parseInt(v, 10))}>
            <SelectTrigger size="sm" className="w-[6.5em]" title={t('Zoom')}>
                <SelectValue placeholder={t('Zoom')} />
            </SelectTrigger>

            <SelectContent>
                {zoomOptions.map((val) => (
                    <SelectItem key={val} value={String(val)}>{t('Zoom')} {val}x</SelectItem>
                ))}
            </SelectContent>
        </Select>
    </>);
}

const zoomOptions = Array.from({ length: 13 }, (_unused, z) => 2 ** z);

function Indicator_PlaybackRate() {
    const playbackRate = useAtomValue(playbackRateAtom);
    const { t } = useTranslation();
    let flashColor = 'rgb(234 88 12)';
    if (playbackRate === 1) {
        flashColor = 'rgb(8 145 178)';
    } else if (playbackRate < 1) {
        flashColor = 'rgb(234 179 8)';
    }
    return (
        <motion.div
            className="px-0.5 text-xs text-muted-foreground rounded-lg"
            initial={{ scale: 2, backgroundColor: flashColor }}
            animate={{ scale: 1, backgroundColor: 'rgba(0,0,0,0)' }}
            transition={{ duration: 0.2 }}
            title={t('Playback rate')}
            key={playbackRate}
        >
            {playbackRate.toFixed(1)}
        </motion.div>
    );
}

async function handleChangePlaybackRateClick() {
    const newRate = await askForPlaybackRate({ detectedFps: jotaiDefaultStore.get(detectedFpsAtom), outputPlaybackRate: jotaiDefaultStore.get(outputPlaybackRateAtom) });
    if (newRate != null) {
        player.setOutputPlaybackRate(newRate);
    }
}

function Button_Fps() {
    const detectedFps = useAtomValue(detectedFpsAtom);
    const outputPlaybackRate = useAtomValue(outputPlaybackRateAtom);
    const { t } = useTranslation();
    return (
        <div className="whitespace-nowrap flex items-center">
            <Button_Bar title={t('Change FPS')} onClick={handleChangePlaybackRateClick}>
                <GaugeIcon className="size-5" />
            </Button_Bar>

            {detectedFps != null && (
                <span className="ml-1 text-xs text-muted-foreground cursor-pointer" title={t('Video FPS')} onClick={handleChangePlaybackRateClick} role="button">
                    {(detectedFps * outputPlaybackRate).toFixed(3)}
                </span>
            )}
        </div>
    );
}

function Button_Rotation() {
    const rotation = useAtomValue(rotationAtom);
    const isRotationSet = useAtomValue(isRotationSetAtom);
    const actionTitle = useAtomValue(actionTitleAtom);
    const rotationStr = `${rotation}°`;
    const { t } = useTranslation();
    return (
        <Button_Bar
            className="whitespace-nowrap flex items-center"
            title={actionTitle(`${t('Set output rotation. Current: ')} ${isRotationSet ? rotationStr : t('Don\'t modify')}`, 'increaseRotation')}
            onClick={increaseRotation}
        >
            <RotateCcwSquareIcon className={cn('size-5', isRotationSet && activeClasses)} />
            <span className="ml-0.5 inline-block text-xs text-right">{isRotationSet && rotationStr}</span>
        </Button_Bar>
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

                <span className="ml-2 min-w-[3.5em] inline-block">
                    {getFrameCount(displayTime) ?? 0}
                    <span className="select-none opacity-50">
                        f
                    </span>
                    {isZoomed && (
                        <span className="ml-2">
                            {Math.round((displayTime / fileDurationNonZero) * 100)}
                            <span className="select-none opacity-50">
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

function Button_CaptureFormat() {
    const { captureFormat } = useAtomValue(userSettingsAtom);
    const actionTitle = useAtomValue(actionTitleAtom);
    const { t } = useTranslation();
    return (
        <Button size="xs" variant="outline" className="w-[3.7em]" title={actionTitle(t('Capture frame format'), 'toggleCaptureFormat')} onClick={(e) => { e.currentTarget.blur(); toggleCaptureFormat(); }}>
            {captureFormat.toUpperCase()}
        </Button>
    );
}

function toggleCaptureFormat() {
    if (hasAction('toggleCaptureFormat')) {
        void runAction('toggleCaptureFormat');
        return;
    }
    const index = captureFormats.indexOf(userSettings.captureFormat);
    userSettings.captureFormat = captureFormats[(index + 1) % captureFormats.length]!;
}

const captureFormats: CaptureFormat[] = ['jpeg', 'png', 'webp'];

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
            className={cn('text-[.7em] border border-muted-foreground', roundButtonClasses)}
            style={style}
            onClick={player.toggleLoopSelectedSegments}
            title={actionTitle(t('Play selected segments in order'), 'toggleLoopSelectedSegments')}
            role="button"
        >
            <Icon className="size-3 fill-current" />
        </div>
    );
}

function Button_ToggleExportConfirm() {
    const { exportConfirmEnabled } = useAtomValue(userSettingsAtom);
    const { t } = useTranslation();
    return (
        <Button_Bar
            className={cn(exportConfirmEnabled ? activeClasses : 'text-muted-foreground', exportConfirmEnabled && 'ml-1')}
            onClick={toggleExportConfirmEnabled}
            title={t('Show export options screen before exporting?')}
        >
            <NotebookTextIcon className="size-5.5" />
        </Button_Bar>
    );
}

//---------------------------------------------------------------------------

function Button_Export() {
    const segmentsToExport = useAtomValue(segmentsToExportAtom);
    const areWeCutting = useAtomValue(areWeCuttingAtom);
    const { autoMerge } = useAtomValue(userSettingsAtom);
    const { t } = useTranslation();

    const CutIcon = areWeCutting ? ScissorsIcon : FileOutputIcon;

    let title = t('Export');
    if (segmentsToExport.length === 1) {
        title = t('Export selection');
    }
    else if (segmentsToExport.length > 1) {
        title = t('Export {{ num }} segments', { num: segmentsToExport.length });
    }

    const text = autoMerge && segmentsToExport.length > 1 ? t('Export+merge') : t('Export');

    return (
        <Button size="sm" className="whitespace-nowrap" title={title} onClick={(e) => { e.currentTarget.blur(); onExportPress(); }}>
            <CutIcon />
            {text}
        </Button>
    );
}

function onExportPress() {
    if (hasAction('export')) {
        void runAction('export');
    }
    else {
        jotaiDefaultStore.set(exportConfirmOpenAtom, true);
    }
}

//---------------------------------------------------------------------------

function Button_Bar({ className, ...rest }: ComponentProps<'button'>) {
    return <button type="button" className={cn('shrink-0 hover:text-foreground cursor-pointer', className)} {...rest} />;
}
