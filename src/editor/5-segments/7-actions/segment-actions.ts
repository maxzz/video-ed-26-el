import i18n from 'i18next';
import pMap from 'p-map';
import invariant from 'tiny-invariant';
import sortBy from 'lodash/sortBy.js';
import type { DefiniteSegmentBase, SegmentBase, StateSegment } from '@/editor/0-core/8-lib/9-types-core.ts';
import { jotaiDefaultStore } from '@/utils/local-utils/9-jotai-default-store.ts';
import { userSettings } from '@/editor/0-core/9-state/user-settings.ts';
import { maxLabelLengthAtom } from '@/editor/0-core/9-state/user-settings.ts';
import { UserFacingError } from '@/editor/0-core/8-lib/9-error-types.ts';
import { getFileSize, shuffleArray } from '@/editor/0-core/8-lib/util.ts';
import { maxSegmentsAllowed } from '@/editor/0-core/8-lib/constants.ts';
import { handleError, isWorking, setWorking } from '@/editor/0-core/9-state/working.ts';
import { parseTimecode, timecodePlaceholderAtom } from '@/editor/0-core/9-state/timecode.ts';
import { askForAlignSegments } from '@/components/4-dialogs/7-1-dialogs/10-ask-for-align-segments.tsx';
import { askForSegmentDuration } from '@/components/4-dialogs/7-1-dialogs/07-ask-for-segment-duration.tsx';
import {
    createFixedByteSixedSegments as createFixedByteSixedSegmentsDialog,
    createNumSegments as createNumSegmentsDialog, createRandomSegments as createRandomSegmentsDialog, errorToast,
    labelSegmentDialog, selectSegmentsByLabelDialog, toastError,
} from '@/components/4-dialogs/7-1-dialogs/00-app-dialogs.tsx';
import { findKeyframeNearTime, mapTimesToSegments, readFrames } from '@/editor/0-core/8-lib/ffmpeg/ffmpeg.ts';
import { fileDurationAtom, filePathAtom, mainFileMetaAtom } from '@/editor/2-file/9-state/a-file-atoms.ts';
import { activeVideoStreamAtom } from '@/editor/3-player/9-state/player-atoms.ts';
import { checkFileOpened, getRelevantTime } from '@/editor/3-player/7-actions/player-actions.ts';
import {
    addSegmentColorIndex, combineOverlappingSegments as combineOverlappingSegments2, combineSelectedSegments as combineSelectedSegments2,
    createSegment, filterNonMarkers, invertSegments, isDurationValid, isInitialSegment, makeDurationSegments, sortSegments,
} from '../8-lib/segments.ts';
import {
    commitSegments, currentCutSegAtom, currentCutSegOrWholeTimelineAtom, currentSegIndexAtom, currentSegIndexSafeAtom,
    cutSegmentsAtom, findSegmentsAtCursor, getCutSegments, resetSegmentsHistory, segColorCounterAtom, selectedSegmentsAtom,
} from '../9-state/segments-store.ts';

// Port of upstream useSegments (detection lives in b-detect, expression dialogs in 5-segments/0-ui)

const offsetSegments = (segments: DefiniteSegmentBase[], offset: number) => segments.map((s) => ({ start: s.start + offset, end: s.end + offset }));

const getFileDuration = () => jotaiDefaultStore.get(fileDurationAtom);

export function setCurrentSegIndex(index: number | ((old: number) => number)) {
    jotaiDefaultStore.set(currentSegIndexAtom, index);
}

export function createIndexedSegment({ segment, incrementCount }: { segment?: Parameters<typeof createSegment>[0]; incrementCount?: boolean; } = {}) {
    if (incrementCount) jotaiDefaultStore.set(segColorCounterAtom, (v) => v + 1);
    return addSegmentColorIndex(createSegment(segment), jotaiDefaultStore.get(segColorCounterAtom));
}

export function clearSegColorCounter() {
    jotaiDefaultStore.set(segColorCounterAtom, 0);
}

/** Replaces all segments (one undo step). Clamps times, converts zero length segments into markers and drops the "initial" flag */
export function setCutSegments(newSegmentsOrFn: StateSegment[] | ((existing: StateSegment[]) => StateSegment[]), clampDuration?: number) {
    function clampValue(val: number | undefined) {
        if (val == null || Number.isNaN(val)) return undefined;
        const clamped = Math.max(val, 0);
        if (clampDuration == null) return clamped;
        return Math.min(clamped, clampDuration);
    }

    const newSegments = typeof newSegmentsOrFn === 'function' ? newSegmentsOrFn(getCutSegments()) : newSegmentsOrFn;

    commitSegments(newSegments.map(({ start, end, initial: _ignored, ...rest }) => {
        const startClamped = clampValue(start) ?? 0;
        const endClamped = clampValue(end);
        // convert 0 length segments into a markers
        if (endClamped == null || endClamped <= startClamped) return { ...rest, start: startClamped };
        return { ...rest, start: startClamped, end: endClamped };
    }));
}

/** Like setCutSegments but without clamping or touching "initial" (used for selection changes) */
function setCutSegmentsRaw(fn: (existing: StateSegment[]) => StateSegment[]) {
    commitSegments(fn(getCutSegments()));
}

export function clearSegments() {
    clearSegColorCounter();
    setCutSegments([]);
}

/** Close file: forget segments and their history */
export function resetSegments() {
    clearSegColorCounter();
    resetSegmentsHistory();
    jotaiDefaultStore.set(currentSegIndexAtom, 0);
}

export function shuffleSegments() {
    setCutSegments((existing) => [
        ...existing.filter((s) => !s.selected),
        ...shuffleArray(existing.filter((s) => s.selected)),
    ]);
}

export function loadCutSegments({ segments, append, clampDuration, getNextCurrentSegIndex }: {
    segments: SegmentBase[];
    append: boolean;
    clampDuration?: number | undefined;
    getNextCurrentSegIndex?: (newEdl: SegmentBase[]) => number;
}) {
    if (segments.length === 0) throw new UserFacingError(i18n.t('No valid segments found'));
    if (segments.length > maxSegmentsAllowed) throw new UserFacingError(i18n.t('Tried to create too many segments (max {{maxSegmentsAllowed}}.)', { maxSegmentsAllowed }));

    if (!append) clearSegColorCounter();

    setCutSegments((existingSegments) => {
        const needToAppend = append && !isInitialSegment(existingSegments);
        let newSegments = segments.map((segment, i) => createIndexedSegment({ segment, incrementCount: needToAppend || i > 0 }));
        if (needToAppend) newSegments = [...existingSegments, ...newSegments];
        if (getNextCurrentSegIndex) setCurrentSegIndex(getNextCurrentSegIndex(newSegments));
        return newSegments;
    }, clampDuration);
}

export function deleteCurrentCutSeg() {
    const currentCutSeg = jotaiDefaultStore.get(currentCutSegAtom);
    if (currentCutSeg == null) return;
    setCutSegments((existing) => existing.filter((s) => s.segId !== currentCutSeg.segId));
}

export function removeSegments(removeSegmentIds: string[]) {
    setCutSegments((existingSegments) => {
        const newSegments = existingSegments.filter((seg) => !removeSegmentIds.includes(seg.segId));
        // when removing the last segments, we start over
        if (newSegments.length === 0) clearSegColorCounter();
        return newSegments;
    });
}

export function removeSegment(index: number, wholeSegment?: true) {
    const seg = getCutSegments()[index];
    if (seg == null) return;
    if (wholeSegment || seg.end == null) {
        removeSegments([seg.segId]);
    } else {
        // remove end cut point first
        setCutSegments((existing) => existing.map((s, i) => (i === index ? { ...s, end: undefined } : s)));
    }
}

export const getCurrentSegIndexSafe = () => jotaiDefaultStore.get(currentSegIndexSafeAtom);

export function invertAllSegments() {
    const fileDuration = getFileDuration();
    // treat markers as 0 length
    const sortedSegments = sortSegments(jotaiDefaultStore.get(selectedSegmentsAtom));
    const inverseSegmentsAndMarkers = invertSegments(sortedSegments, true, true, fileDuration);
    if (inverseSegmentsAndMarkers.length === 0) {
        errorToast(i18n.t('Make sure you have no overlapping segments.'));
        return;
    }
    // preserve segColorIndex (which represent colors) when inverting
    setCutSegments(inverseSegmentsAndMarkers.map((inverseSegment, index) => addSegmentColorIndex(createSegment(inverseSegment), index)), fileDuration);
}

export function fillSegmentsGaps() {
    const fileDuration = getFileDuration();
    // treat markers as 0 length
    const sortedSegments = sortSegments(jotaiDefaultStore.get(selectedSegmentsAtom).map(({ end, ...rest }) => ({ ...rest, end: end ?? rest.start })));
    const inverseSegmentsAndMarkers = invertSegments(sortedSegments, true, true, fileDuration);
    if (inverseSegmentsAndMarkers.length === 0) {
        errorToast(i18n.t('Make sure you have no overlapping segments.'));
        return;
    }
    const newSegments = inverseSegmentsAndMarkers.map(({ name: _ignored, ...segment }) => createIndexedSegment({ segment, incrementCount: true }));
    setCutSegments((existing) => [...existing, ...newSegments]);
}

export function combineOverlappingSegments() {
    setCutSegments((existing) => [
        ...existing.filter((s) => !s.selected),
        ...combineOverlappingSegments2(existing.filter((s) => s.selected)), // only process selected
    ]);
}

export function combineSelectedSegments() {
    setCutSegments((existing) => combineSelectedSegments2(existing));
}

export function updateSegAtIndex(index: number, newProps: Partial<StateSegment>) {
    if (index < 0) return;
    const cutSegments = getCutSegments();
    const existing = cutSegments[index];
    invariant(existing != null);
    const cutSegmentsNew = [...cutSegments];
    cutSegmentsNew.splice(index, 1, { ...existing, ...newProps });
    setCutSegments(cutSegmentsNew, getFileDuration());
}

export function setCutTime(type: 'start' | 'end' | 'move', time: number | undefined) {
    const fileDuration = getFileDuration();
    const currentCutSeg = jotaiDefaultStore.get(currentCutSegAtom);
    if (!isDurationValid(fileDuration) || currentCutSeg == null) return;
    const currentSegIndexSafe = jotaiDefaultStore.get(currentSegIndexSafeAtom);

    const clampStart = (start: number) => Math.min(Math.max(start, 0), fileDuration);
    const clampEnd = (end?: number | undefined) => (end != null ? Math.min(Math.max(end, 0), fileDuration) : undefined);

    if (type === 'start') {
        invariant(time != null);
        if (currentCutSeg.end != null && time >= currentCutSeg.end) throw new UserFacingError(i18n.t('Segment start time must precede end time'));
        updateSegAtIndex(currentSegIndexSafe, { start: clampStart(time) });
    }
    if (type === 'end') {
        if (time != null && time <= currentCutSeg.start) throw new UserFacingError(i18n.t('Segment start time must precede end time'));
        updateSegAtIndex(currentSegIndexSafe, { end: clampEnd(time) });
    }
    if (type === 'move') {
        invariant(time != null);
        updateSegAtIndex(currentSegIndexSafe, {
            start: clampStart(time),
            ...(currentCutSeg.end != null && { end: clampEnd(time + (currentCutSeg.end - currentCutSeg.start)) }),
        });
    }
}

export async function modifySelectedSegmentTimes(transformSegment: <T extends SegmentBase>(s: T) => Promise<T> | T, concurrency = 5) {
    const newSegments = await pMap(getCutSegments(), async (segment) => (segment.selected ? transformSegment(segment) : segment), { concurrency });
    setCutSegments(newSegments, getFileDuration());
}

export async function alignSegmentTimesToKeyframes() {
    const videoStream = jotaiDefaultStore.get(activeVideoStreamAtom);
    const filePath = jotaiDefaultStore.get(filePathAtom);
    if (!videoStream || filePath == null || isWorking()) return;
    try {
        const response = await askForAlignSegments();
        if (response == null) return;
        setWorking({ text: i18n.t('Aligning segments to keyframes') });
        const { mode, startOrEnd } = response;
        await modifySelectedSegmentTimes(async (segment) => {
            const newSegment = { ...segment };
            const align = async (key: 'start' | 'end') => {
                const time = newSegment[key];
                if (time != null) {
                    const keyframe = await findKeyframeNearTime({
                        filePath,
                        streamIndex: videoStream.index,
                        time,
                        mode: mode === 'opposing' ? (key === 'start' ? 'before' : 'after') : mode,
                    });
                    if (keyframe == null) throw new UserFacingError(i18n.t('Cannot find any keyframe within 60 seconds of frame {{time}}', { time }));
                    newSegment[key] = keyframe;
                }
            };
            if (startOrEnd.includes('start')) await align('start');
            if (startOrEnd.includes('end')) await align('end');
            return newSegment;
        });
    } catch (err) {
        handleError({ err });
    } finally {
        setWorking(undefined);
    }
}

export function updateSegOrder(index: number, newOrder: number) {
    const cutSegments = getCutSegments();
    if (newOrder > cutSegments.length - 1 || newOrder < 0) return;
    const newSegments = [...cutSegments];
    const removedSeg = newSegments.splice(index, 1)[0];
    invariant(removedSeg != null);
    newSegments.splice(newOrder, 0, removedSeg);
    setCutSegments(newSegments);
    setCurrentSegIndex(newOrder);
}

export function updateSegOrders(newOrders: string[]) {
    const newSegments = sortBy(getCutSegments(), (seg) => newOrders.indexOf(seg.segId));
    setCutSegments(newSegments);
    const currentCutSeg = jotaiDefaultStore.get(currentCutSegAtom);
    if (currentCutSeg != null) {
        const newCurrentSegIndex = newOrders.indexOf(currentCutSeg.segId);
        if (newCurrentSegIndex !== -1 && newCurrentSegIndex < newSegments.length) setCurrentSegIndex(newCurrentSegIndex);
    }
}

export function reorderSegsByStartTime() {
    setCutSegments(sortBy(getCutSegments(), (seg) => seg.start));
}

export function addSegment() {
    try {
        const fileDuration = getFileDuration();
        const suggestedStart = getRelevantTime();
        if (fileDuration == null || suggestedStart >= fileDuration) return;

        const cutSegments = getCutSegments();
        const initial = isInitialSegment(cutSegments);
        const suggestedEnd = userSettings.simpleMode ? Math.min(suggestedStart + 10, fileDuration) : undefined;
        const newSegment = createIndexedSegment({ segment: { start: suggestedStart, end: suggestedEnd }, incrementCount: !initial });

        // if initial segment, replace it instead
        const cutSegmentsNew = initial ? [newSegment] : [...cutSegments, newSegment];
        setCutSegments(cutSegmentsNew, fileDuration);
        setCurrentSegIndex(cutSegmentsNew.length - 1);
    } catch (err) {
        console.error(err);
    }
}

export function duplicateSegment(segment: Pick<StateSegment, 'start' | 'end'> & Partial<Pick<StateSegment, 'name'>>) {
    const cutSegmentsNew = [
        ...getCutSegments(),
        createIndexedSegment({ segment: { start: segment.start, end: segment.end, name: segment.name }, incrementCount: true }),
    ];
    setCutSegments(cutSegmentsNew);
    setCurrentSegIndex(cutSegmentsNew.length - 1);
}

export function duplicateCurrentSegment() {
    const currentCutSeg = jotaiDefaultStore.get(currentCutSegAtom);
    if (currentCutSeg != null) duplicateSegment(currentCutSeg);
}

export function setCutStart() {
    if (!checkFileOpened()) return;
    const relevantTime = getRelevantTime();
    const currentCutSeg = jotaiDefaultStore.get(currentCutSegAtom);
    // https://github.com/mifi/lossless-cut/issues/168
    // If current time is after the end of the current segment in the timeline, or there is no segment,
    // conveniently add a new segment that starts at playerTime
    if (currentCutSeg == null || (currentCutSeg.end != null && relevantTime >= currentCutSeg.end)) {
        addSegment();
    } else {
        try {
            setCutTime('start', relevantTime);
        } catch (err) {
            toastError(err);
        }
    }
}

export function setCutEnd() {
    if (!checkFileOpened()) return;
    try {
        setCutTime('end', getRelevantTime());
    } catch (err) {
        toastError(err);
    }
}

export async function labelSegment(index: number) {
    const seg = getCutSegments()[index];
    if (seg == null) return;
    const value = await labelSegmentDialog({ currentName: seg.name, maxLength: jotaiDefaultStore.get(maxLabelLengthAtom) });
    if (value != null) updateSegAtIndex(index, { name: value });
}

export const labelCurrentSegment = () => labelSegment(jotaiDefaultStore.get(currentSegIndexSafeAtom));

export function selectSegments(segmentsToSelect: { segId: string; }[]) {
    const segIdsToSelect = new Set(segmentsToSelect.map(({ segId }) => segId));
    if (segIdsToSelect.size === 0) return; // no point in selecting none
    setCutSegmentsRaw((existing) => existing.map(({ selected, ...segment }) => ({ ...segment, selected: selected || segIdsToSelect.has(segment.segId) })));
}

export function focusSegmentAtCursor() {
    const [index] = findSegmentsAtCursor(getCutSegments(), getRelevantTime());
    if (index != null) setCurrentSegIndex(index);
}

export function selectSegmentsAtCursor() {
    const cutSegments = getCutSegments();
    selectSegments(findSegmentsAtCursor(cutSegments, getRelevantTime()).flatMap((index) => (cutSegments[index] ? [cutSegments[index]] : [])));
}

export function splitCurrentSegment() {
    const relevantTime = getRelevantTime();
    const cutSegments = getCutSegments();
    const [index] = findSegmentsAtCursor(cutSegments, relevantTime);

    if (index == null) {
        errorToast(i18n.t('No segment to split. Please move cursor over the segment you want to split'));
        return;
    }

    const segment = cutSegments[index];
    invariant(segment != null);
    if (segment.start === relevantTime || segment.end === relevantTime) return; // No point

    const getNewName = (oldName: string, suffix: string) => oldName && `${segment.name} ${suffix}`;
    const firstPart = createIndexedSegment({ segment: { name: getNewName(segment.name, '1'), start: segment.start, end: relevantTime }, incrementCount: false });
    const secondPart = createIndexedSegment({ segment: { name: getNewName(segment.name, '2'), start: relevantTime, end: segment.end }, incrementCount: true });

    const newSegments = [...cutSegments];
    newSegments.splice(index, 1, firstPart, secondPart);
    setCutSegments(newSegments);
}

export async function createNumSegments() {
    const timeline = jotaiDefaultStore.get(currentCutSegOrWholeTimelineAtom);
    if (!checkFileOpened() || timeline.duration <= 0) return;
    const segments = await createNumSegmentsDialog(timeline.duration);
    if (!segments) return;
    deleteCurrentCutSeg();
    loadCutSegments({ segments: offsetSegments(segments, timeline.start), append: true, getNextCurrentSegIndex: (edl) => edl.length - 1, clampDuration: getFileDuration() });
}

export async function createFixedDurationSegments() {
    const timeline = jotaiDefaultStore.get(currentCutSegOrWholeTimelineAtom);
    if (!checkFileOpened() || timeline.duration <= 0) return;
    const segmentDuration = await askForSegmentDuration({ totalDuration: timeline.duration, inputPlaceholder: jotaiDefaultStore.get(timecodePlaceholderAtom), parseTimecode });
    if (segmentDuration == null) return;
    deleteCurrentCutSeg();
    const segments = makeDurationSegments(segmentDuration, timeline.duration);
    loadCutSegments({ segments: offsetSegments(segments, timeline.start), append: true, getNextCurrentSegIndex: (edl) => edl.length - 1, clampDuration: getFileDuration() });
}

export async function createFixedByteSizedSegments() {
    const fileDuration = getFileDuration();
    if (!checkFileOpened() || !isDurationValid(fileDuration)) return;
    const mainFileMeta = jotaiDefaultStore.get(mainFileMetaAtom);
    invariant(mainFileMeta != null);
    const fileSize = getFileSize(mainFileMeta.ffprobeMeta.format);
    invariant(fileSize != null);
    const segmentDuration = await createFixedByteSixedSegmentsDialog({ fileDuration, fileSize });
    if (segmentDuration == null) return;
    loadCutSegments({ segments: makeDurationSegments(segmentDuration, fileDuration), append: true, clampDuration: fileDuration });
}

export function getSegEstimatedSize(segment: Pick<StateSegment, 'start' | 'end'>) {
    const mainFileMeta = jotaiDefaultStore.get(mainFileMetaAtom);
    const fileDuration = getFileDuration();
    if (mainFileMeta == null || !isDurationValid(fileDuration) || segment.end == null) return undefined;
    const fileSize = getFileSize(mainFileMeta.ffprobeMeta.format);
    if (fileSize == null) return undefined;
    return Math.round(((segment.end - segment.start) / fileDuration) * fileSize);
}

export async function createRandomSegments() {
    const timeline = jotaiDefaultStore.get(currentCutSegOrWholeTimelineAtom);
    if (!checkFileOpened() || timeline.duration <= 0) return;
    const segments = await createRandomSegmentsDialog(timeline.duration);
    if (!segments) return;
    deleteCurrentCutSeg();
    loadCutSegments({ segments: offsetSegments(segments, timeline.start), append: true, getNextCurrentSegIndex: (edl) => edl.length - 1, clampDuration: getFileDuration() });
}

export async function createSegmentsFromKeyframes() {
    const { start, end } = jotaiDefaultStore.get(currentCutSegOrWholeTimelineAtom);
    const videoStream = jotaiDefaultStore.get(activeVideoStreamAtom);
    const filePath = jotaiDefaultStore.get(filePathAtom);
    deleteCurrentCutSeg();
    if (!videoStream || filePath == null) return;
    const keyframes = (await readFrames({ filePath, from: start, to: end, streamIndex: videoStream.index })).filter((frame) => frame.keyframe);
    const newSegments = mapTimesToSegments(keyframes.map((keyframe) => keyframe.time), true);
    loadCutSegments({ segments: newSegments, append: true, getNextCurrentSegIndex: (edl) => edl.length - 1, clampDuration: getFileDuration() });
}

export async function selectSegmentsByLabel() {
    const value = await selectSegmentsByLabelDialog(jotaiDefaultStore.get(currentCutSegAtom)?.name);
    if (value == null) return;
    selectSegments(getCutSegments().filter((seg) => seg.name === value));
}

export function selectAllMarkers() {
    selectSegments(getCutSegments().filter((seg) => seg.end == null));
}

export async function labelSelectedSegments() {
    const firstSelectedSegment = jotaiDefaultStore.get(selectedSegmentsAtom)[0];
    if (firstSelectedSegment == null) return;
    const value = await labelSegmentDialog({ currentName: firstSelectedSegment.name, maxLength: jotaiDefaultStore.get(maxLabelLengthAtom) });
    if (value == null) return;
    setCutSegments((existing) => existing.map((s) => (s.selected ? { ...s, name: value } : s)));
}

export function maybeCreateFullLengthSegment(newFileDuration: number) {
    // don't use setCutSegments because we want to keep initial: true
    if (getCutSegments().length > 0 || newFileDuration <= 0) return;
    const segment = { start: 0, end: newFileDuration, initial: true } as const;
    console.log('Creating initial segment', segment);
    commitSegments([createIndexedSegment({ segment })]);
}

export function removeSelectedSegments() {
    removeSegments(jotaiDefaultStore.get(selectedSegmentsAtom).map((seg) => seg.segId));
}

export function selectOnlySegment(seg: Pick<StateSegment, 'segId'>) {
    setCutSegmentsRaw((existing) => existing.map((segment) => ({ ...segment, selected: segment.segId === seg.segId })));
}

export function toggleSegmentSelected(seg: Pick<StateSegment, 'segId'>) {
    setCutSegmentsRaw((existing) => existing.map((segment) => (segment.segId !== seg.segId ? segment : { ...segment, selected: !segment.selected })));
}

export const deselectAllSegments = () => setCutSegmentsRaw((existing) => existing.map((segment) => ({ ...segment, selected: false })));
export const selectAllSegments = () => setCutSegmentsRaw((existing) => existing.map((segment) => ({ ...segment, selected: true })));
export const invertSelectedSegments = () => setCutSegmentsRaw((existing) => existing.map((segment) => ({ ...segment, selected: !segment.selected })));

export function selectOnlyCurrentSegment() {
    const currentCutSeg = jotaiDefaultStore.get(currentCutSegAtom);
    if (currentCutSeg != null) selectOnlySegment(currentCutSeg);
}

export function toggleCurrentSegmentSelected() {
    const currentCutSeg = jotaiDefaultStore.get(currentCutSegAtom);
    if (currentCutSeg != null) toggleSegmentSelected(currentCutSeg);
}

export function getSegmentsAtCursor() {
    const cutSegments = jotaiDefaultStore.get(cutSegmentsAtom);
    return findSegmentsAtCursor(cutSegments, getRelevantTime()).flatMap((index) => (cutSegments[index] ? [cutSegments[index]] : []));
}

export { filterNonMarkers };
