import { useAtomValue } from "jotai";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { cn } from "@/utils/classnames";
import { motion } from "motion/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { ContrastIcon, GaugeIcon, RotateCcwSquareIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import * as player from "@/editor/3-player/7-actions/player-actions";
import { askDialog_ForPlaybackRate } from "@/components/4-dialogs/7-1-dialogs/13-ask-for-playback-rate";
import { detectedFpsAtom, hasVideoAtom, isFileOpenedAtom, isRotationSetAtom, rotationAtom } from "@/editor/2-file/9-state/a-file-atoms";
import { outputPlaybackRateAtom, playbackRateAtom } from "@/editor/3-player/9-state/a-player-atoms";
import { invertCutSegmentsAtom } from "@/editor/5-segments/9-state/a-seg-ui-atoms";
import { actionTitleAtom } from "@/editor/4-timeline/9-state/action-title";
import { zoomAtom } from "@/editor/4-timeline/9-state/timeline-atoms";
import { increaseRotation, timelineToggleComfortZoom, toggleInvertCutSegments, zoomAbs } from "@/editor/4-timeline/7-actions/3-timeline-actions";
import { Button_Bar, activeClasses } from "./8-status-bar-shared";
import { Track_Toggles } from "./2-track-toggles";

/** Waveform, zoom, and related controls shown in the status bar. */
export function BarPlayback_StatusControls({ simpleMode }: { simpleMode: boolean; }) {
    const isFileOpened = useAtomValue(isFileOpenedAtom);
    const hasVideo = useAtomValue(hasVideoAtom);

    return (
        <div className="flex items-center gap-1.5">
            {!simpleMode && <Track_Toggles />}
            
            <Button_InvertCutMode />

            {isFileOpened && !simpleMode && (<>
                <Button_ZoomControls />
                <Indicator_PlaybackRate />
                <Button_Fps />
            </>)}

            {isFileOpened && !simpleMode && hasVideo && <Button_Rotation />}
        </div>
    );
}

//---------------------------------------------------------------------------

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

//---------------------------------------------------------------------------

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

//---------------------------------------------------------------------------

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

//---------------------------------------------------------------------------

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

async function handleChangePlaybackRateClick() {
    const newRate = await askDialog_ForPlaybackRate({ detectedFps: jotaiDefaultStore.get(detectedFpsAtom), outputPlaybackRate: jotaiDefaultStore.get(outputPlaybackRateAtom) });
    if (newRate != null) {
        player.setOutputPlaybackRate(newRate);
    }
}

//---------------------------------------------------------------------------

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
            <span className="inline-block ml-0.5 text-xs text-right">{isRotationSet && rotationStr}</span>
        </Button_Bar>
    );
}

//---------------------------------------------------------------------------
