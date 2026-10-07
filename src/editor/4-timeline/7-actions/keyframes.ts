import i18n from "i18next";
import { observe } from "jotai-effect";
import sortBy from "lodash/sortBy.js";
import { type Frame } from "@/editor/0-core/8-lib/ffmpeg/ffmpeg";
import { readFrames, readFramesAroundTime } from "@/editor/0-core/8-lib/ffmpeg/ffmpeg";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { handleError, setWorking } from "@/editor/0-core/9-state/working";
import { ffmpegExtractWindow } from "@/editor/0-core/8-lib/constants";
import { filePathAtom } from "@/editor/2-file/9-state/a-file-atoms";
import { activeVideoStreamAtom, commandedTimeAtom } from "@/editor/3-player/9-state/a-player-atoms";
import { currentCutSegOrWholeTimelineAtom } from "@/editor/5-segments/9-state/segments-store";
import { keyframesEnabledAtom, maxKeyframesAtom, neighbouringKeyFramesMapAtom } from "../9-state/timeline-atoms";

// Port of upstream useKeyframes

const toObj = (map: Frame[]) => Object.fromEntries(map.map((frame) => [frame.time, frame]));

let readingKeyframes = false;

// Forget keyframes when the file or the video stream changes
observe((get, set) => {
    get(filePathAtom);
    get(activeVideoStreamAtom);
    set(neighbouringKeyFramesMapAtom, {});
}, jotaiDefaultStore);

// Read keyframes around the commanded time (debounced). We still want to read them even if they are not shown,
// because maybe we want to be able to step to the closest keyframe
observe((get) => {
    const keyframesEnabled = get(keyframesEnabledAtom);
    const filePath = get(filePathAtom);
    const commandedTime = get(commandedTimeAtom);
    const videoStream = get(activeVideoStreamAtom);
    const maxKeyframes = get(maxKeyframesAtom);

    let aborted = false;

    const timer = setTimeout(async () => {
        if (!keyframesEnabled || filePath == null || !videoStream || readingKeyframes) return;
        try {
            readingKeyframes = true;
            const newFrames = await readFramesAroundTime({ filePath, aroundTime: commandedTime, streamIndex: videoStream.index, window: ffmpegExtractWindow });
            if (aborted) return;
            const newKeyFrames = newFrames.filter((frame) => frame.keyframe);
            jotaiDefaultStore.set(neighbouringKeyFramesMapAtom, (existingKeyFramesMap) => {
                let existingFrames = Object.values(existingKeyFramesMap);
                if (existingFrames.length >= maxKeyframes) {
                    existingFrames = sortBy(existingFrames, 'createdAt').slice(newKeyFrames.length);
                }
                return {
                    ...toObj(existingFrames),
                    ...toObj(newKeyFrames),
                };
            });
        } catch (err) {
            console.error('Failed to read keyframes', err);
        } finally {
            readingKeyframes = false;
        }
    }, 500);

    return () => {
        aborted = true;
        clearTimeout(timer);
    };
}, jotaiDefaultStore);

export async function readAllKeyframes() {
    const { start, end } = jotaiDefaultStore.get(currentCutSegOrWholeTimelineAtom);
    const filePath = jotaiDefaultStore.get(filePathAtom);
    const videoStream = jotaiDefaultStore.get(activeVideoStreamAtom);
    if (!filePath || !videoStream) return;
    try {
        setWorking({ text: i18n.t('Reading all keyframes') });
        const newFrames = await readFrames({ filePath, from: start, to: end, streamIndex: videoStream.index });
        const newKeyFrames = newFrames.filter((frame) => frame.keyframe);
        jotaiDefaultStore.set(neighbouringKeyFramesMapAtom, toObj(newKeyFrames));
        jotaiDefaultStore.set(maxKeyframesAtom, newKeyFrames.length);
    } catch (err) {
        handleError({ err });
    } finally {
        setWorking(undefined);
    }
}
