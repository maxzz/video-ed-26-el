import i18n from "i18next";
import { fire_Dialog } from "../7-0-dialogs/1-dialogs";

import { type FindKeyframeMode } from "../../../editor/0-core/8-lib/ffmpeg/ffmpeg";
import { askDialog_ForSegmentsStartOrEnd } from "./09-ask-for-segments-start-or-end";

export async function askDialog_ForAlignSegments() {
    const startOrEnd = await askDialog_ForSegmentsStartOrEnd(i18n.t('Do you want to align the segment start or end timestamps to keyframes?'));
    if (startOrEnd == null) {
        return undefined;
    }

    const { value: mode } = await fire_Dialog<FindKeyframeMode | 'opposing'>({
        input: 'radio',
        showCancelButton: true,
        inputOptions: {
            nearest: i18n.t('Nearest keyframe'),
            before: i18n.t('Previous keyframe'),
            after: i18n.t('Next keyframe'),
            opposing: i18n.t('Segment start to previous keyframe and end to next keyframe'),
        } satisfies Record<FindKeyframeMode | 'opposing', unknown>,
        inputValue: 'before',
        text: i18n.t('Do you want to align segment times to the nearest, previous or next keyframe?'),
    });
    
    if (mode == null) {
        return undefined;
    }
    return { mode, startOrEnd };
}
