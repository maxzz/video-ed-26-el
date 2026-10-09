import { atom } from "jotai";
import { jotaiDefaultStore } from "../../../utils/local-utils/9-jotai-default-store";
import i18n from "i18next";

import { userSettingsAtom } from "./user-settings";

import { fire_Dialog } from "../../../components/4-dialogs/7-0-dialogs/1-dialogs";

import { type FormatTimecode, type ParseTimecode } from "../8-lib/9-types-core";
import { getFrameCountRaw } from "@/editor/9-closed-captions/8-lib/edl-formats";
import { getFrameDuration } from "../8-lib/util";
import { formatDuration, parseDuration } from "../8-lib/duration";
import { detectedFpsAtom } from "@/editor/2-file/9-state/a-file-atoms";

// Port of upstream useTimecode: the functions are derived atoms, so they change when fps or format changes

export const getFrameCountAtom = atom((get) => {
    const detectedFps = get(detectedFpsAtom);
    return (sec: number) => getFrameCountRaw(detectedFps, sec);
});

export const formatTimecodeAtom = atom<FormatTimecode>((get) => {
    const detectedFps = get(detectedFpsAtom);
    const { timecodeFormat } = get(userSettingsAtom);
    const getFrameCount = get(getFrameCountAtom);

    return ({ seconds, shorten, fileNameFriendly }) => {
        if (timecodeFormat === 'frameCount') {
            const frameCount = getFrameCount(seconds);
            return frameCount != null ? String(frameCount) : '';
        }
        if (timecodeFormat === 'seconds') {
            return seconds.toFixed(3);
        }
        if (timecodeFormat === 'timecodeWithFramesFraction') {
            return formatDuration({ seconds, shorten, fileNameFriendly, fps: detectedFps });
        }
        return formatDuration({ seconds, shorten, fileNameFriendly });
    };
});

export const timecodePlaceholderAtom = atom(
    (get) => get(formatTimecodeAtom)({ seconds: 0, shorten: false })
);

export const parseTimecodeAtom = atom<ParseTimecode>((get) => {
    const detectedFps = get(detectedFpsAtom);
    const { timecodeFormat } = get(userSettingsAtom);
    return (val: string) => {
        if (timecodeFormat === 'frameCount') {
            return getFrameDuration(detectedFps) * parseInt(val, 10);
        }
        if (timecodeFormat === 'seconds') {
            return parseFloat(val);
        }
        if (timecodeFormat === 'timecodeWithFramesFraction') {
            return parseDuration(val, detectedFps);
        }
        return parseDuration(val);
    };
});

export const formatTimecode: FormatTimecode = (args) => jotaiDefaultStore.get(formatTimecodeAtom)(args);
export const parseTimecode: ParseTimecode = (val) => jotaiDefaultStore.get(parseTimecodeAtom)(val);
export const getFrameCount = (sec: number) => jotaiDefaultStore.get(getFrameCountAtom)(sec);

export async function promptTimecode({ initialValue, title, description, inputPlaceholder, allowRelative = false }: {
    initialValue?: string | undefined;
    title: string;
    description?: string | undefined;
    inputPlaceholder: string;
    allowRelative?: boolean;
}) {
    function parse(value: string) {
        let relDirection: number | undefined;
        if (allowRelative) {
            if (value.startsWith('-')) {
                relDirection = -1;
            }
            else if (value.startsWith('+')) {
                relDirection = 1;
            }
        }
        const withoutPrefix = allowRelative ? value.replace(/^[+-]/, '') : value;
        const duration = parseTimecode(withoutPrefix);
        return duration != null && !Number.isNaN(duration) ? { duration, relDirection } : undefined;
    }

    const { value, isConfirmed } = await fire_Dialog({
        title,
        text: description,
        input: 'text',
        inputValue: initialValue ?? '',
        inputPlaceholder,
        showCancelButton: true,
        confirmButtonText: i18n.t('Go'),
        className: 'max-w-xl',
        inputValidator: (v) => (parse(v) == null ? i18n.t('Invalid timecode format') : undefined),
    });
    
    if (!isConfirmed || value == null) {
        return undefined;
    }
    return parse(value);
}
