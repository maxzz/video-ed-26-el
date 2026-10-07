import i18n from "i18next";
import { type FindKeyframeMode } from "../../../editor/0-core/8-lib/ffmpeg/ffmpeg";
import { fireDialog } from "../7-0-dialogs/dialogs";
import { askForSegmentsStartOrEnd } from "./09-ask-for-segments-start-or-end";

export async function askForAlignSegments() {
    const startOrEnd = await askForSegmentsStartOrEnd(i18n.t('Do you want to align the segment start or end timestamps to keyframes?'));
    if (startOrEnd == null) return undefined;

    const { value: mode } = await fireDialog<FindKeyframeMode | 'opposing'>({
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
    if (mode == null) return undefined;
    return { mode, startOrEnd };
}
