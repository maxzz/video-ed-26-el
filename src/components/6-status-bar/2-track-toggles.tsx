import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { AudioWaveformIcon, ImagesIcon, KeyIcon } from "lucide-react";
import { cn } from "@/utils/classnames";
import { hasAudioAtom, hasVideoAtom } from "@/editor/2-file/9-state/a-file-atoms";
import { actionTitleAtom } from "@/editor/4-timeline/9-state/action-title";
import { keyframesEnabledAtom, showThumbnailsAtom, waveformModeAtom } from "@/editor/4-timeline/9-state/timeline-atoms";
import { toggleShowKeyframes, toggleShowThumbnails, toggleWaveformMode } from "@/editor/4-timeline/7-actions/3-timeline-actions";
import { Button_Bar, activeClasses } from "./8-status-bar-shared";

export function Track_Toggles() {
    const hasAudio = useAtomValue(hasAudioAtom);
    const hasVideo = useAtomValue(hasVideoAtom);
    const waveformMode = useAtomValue(waveformModeAtom);
    const showThumbnails = useAtomValue(showThumbnailsAtom);
    const keyframesEnabled = useAtomValue(keyframesEnabledAtom);
    const actionTitle = useAtomValue(actionTitleAtom);
    const { t } = useTranslation();

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
