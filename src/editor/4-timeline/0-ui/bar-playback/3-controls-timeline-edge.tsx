import { useAtomValue } from "jotai";
import { SkipBackIcon, SkipForwardIcon, StepBackIcon, StepForwardIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import * as player from "@/editor/3-player/7-actions/player-actions";
import { currentCutSegAtom } from "@/editor/5-segments/9-state/a-segments-store";
import { simpleModeAtom } from "@/editor/5-segments/9-state/a-seg-ui-atoms";
import { actionTitleAtom } from "../../9-state/action-title";
import { Button_JumpSegment, Button_SegmentCutpoint } from "./2-btn-segment-cut";
import { Button_Bar } from "./8-bar-playback-shared";

/** Jump-to-edge, neighboring segment, and current-segment cutpoint. Start order is mirrored for the end. */
export function Controls_TimelineEdge({ direction }: { direction: -1 | 1; }) {
    const simpleMode = useAtomValue(simpleModeAtom);
    if (simpleMode) {
        return null;
    }

    const start = direction < 0;

    return (<>
        {start ? <Button_JumpTimelineEdge start={start} /> : <Button_CutpointEdge start={start} />}
        <Button_JumpSegment direction={direction} />
        {start ? <Button_CutpointEdge start={start} /> : <Button_JumpTimelineEdge start={start} />}
    </>);
}

//---------------------------------------------------------------------------

function Button_JumpTimelineEdge({ start }: { start: boolean; }) {
    const actionTitle = useAtomValue(actionTitleAtom);
    const { t } = useTranslation();

    return (
        <Button_Bar
            title={actionTitle(t(start ? 'Jump to start of video' : 'Jump to end of video'), start ? 'jumpTimelineStart' : 'jumpTimelineEnd')}
            onClick={start ? player.jumpTimelineStart : player.jumpTimelineEnd}
        >
            {start ? <SkipBackIcon className="size-4" /> : <SkipForwardIcon className="size-4" />}
        </Button_Bar>
    );
}

function Button_CutpointEdge({ start }: { start: boolean; }) {
    const currentCutSeg = useAtomValue(currentCutSegAtom);
    const actionTitle = useAtomValue(actionTitleAtom);
    const { t } = useTranslation();

    return (
        <Button_SegmentCutpoint
            className={start ? 'mr-1.25' : 'ml-1.25'}
            currentCutSeg={currentCutSeg}
            side={start ? 'start' : 'end'}
            Icon={start ? StepBackIcon : StepForwardIcon}
            onClick={start ? player.jumpCutStart : player.jumpCutEnd}
            title={actionTitle(t(start ? 'Jump to current segment\'s start time' : 'Jump to current segment\'s end time'), start ? 'jumpCutStart' : 'jumpCutEnd')}
        />
    );
}
