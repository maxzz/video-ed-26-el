import type { MouseEvent as ReactMouseEvent } from 'react';
import { observe } from 'jotai-effect';
import { animate, type AnimationPlaybackControls } from 'motion/react';
import debounce from 'lodash/debounce.js';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { prefersReducedMotionAtom, userSettings } from '@/editor/0-core/9-state/user-settings.ts';
import { calculateTimelinePos } from '@/editor/0-core/8-lib/util.ts';
import { fileDurationNonZeroAtom } from '@/editor/2-file/9-state/file-atoms.ts';
import { hoveringTimeAtom } from '@/editor/1-layout/9-state/panels-atoms.ts';
import { commandedTimeAtom, relevantTimeAtom } from '@/editor/3-player/9-state/player-atoms.ts';
import { seekAbs } from '@/editor/3-player/7-actions/player-actions.ts';
import { currentCutSegAtom } from '@/editor/5-segments/9-state/segments-store.ts';
import { setCutTime } from '@/editor/5-segments/7-actions/segment-actions.ts';
import { isModifierPressed } from '../8-lib/modifier-keys.ts';
import { timelineScrollerElementAtom, timelineWrapperElementAtom, zoomAtom, zoomWindowStartTimeAtom } from '../9-state/timeline-atoms.ts';

// Port of the imperative parts of upstream Timeline.tsx: auto scroll, zoom centering and mouse seeking/segment resizing

let skipScrollEvents = false;
const stopSkippingScrollEvents = debounce(() => { skipScrollEvents = false; }, 1000);

function suppressScrollerEvents() {
    skipScrollEvents = true;
    stopSkippingScrollEvents();
}

let scrollAnimation: AnimationPlaybackControls | undefined;

function animateScrollLeft(scroller: HTMLDivElement, target: number) {
    scrollAnimation?.stop();
    if (appStore.get(prefersReducedMotionAtom)) {
        scroller.scrollLeft = target;
        return;
    }
    scrollAnimation = animate(scroller.scrollLeft, target, {
        type: 'spring',
        damping: 100,
        stiffness: 1000,
        onUpdate: (value) => {
            if (!skipScrollEvents) scroller.scrollLeft = value; // Don't animate while zooming
        },
    });
}

export function onTimelineScroll() {
    const scroller = appStore.get(timelineScrollerElementAtom);
    if (!scroller) return;
    const zoom = appStore.get(zoomAtom);
    appStore.set(zoomWindowStartTimeAtom, (scroller.scrollLeft / (scroller.offsetWidth * zoom)) * appStore.get(fileDurationNonZeroAtom));
}

// Pan timeline when cursor moves out of timeline window. https://github.com/mifi/lossless-cut/issues/676
observe((get) => {
    const relevantTime = get(relevantTimeAtom);
    const fileDurationNonZero = get(fileDurationNonZeroAtom);
    const zoom = get(zoomAtom);
    const scroller = get(timelineScrollerElementAtom);
    const wrapper = get(timelineWrapperElementAtom);
    if (!scroller || !wrapper || skipScrollEvents) return;

    const pos = calculateTimelinePos(relevantTime, fileDurationNonZero);
    if (pos == null) return;
    const timeOfInterestPosPixels = pos * zoom * scroller.offsetWidth;

    if (timeOfInterestPosPixels > scroller.scrollLeft + scroller.offsetWidth) {
        const scrollLeft = timeOfInterestPosPixels - (scroller.offsetWidth * 0.1);
        animateScrollLeft(scroller, Math.min(scrollLeft, wrapper.offsetWidth - scroller.offsetWidth));
    } else if (timeOfInterestPosPixels < scroller.scrollLeft) {
        const scrollLeft = timeOfInterestPosPixels - (scroller.offsetWidth * 0.9);
        animateScrollLeft(scroller, Math.max(scrollLeft, 0));
    }
}, appStore);

// Hover time is only valid until the playback position changes
observe((get, set) => {
    get(relevantTimeAtom);
    set(hoveringTimeAtom, undefined);
}, appStore);

let lastZoom = 1;

/** Keep cursor in middle while zooming. Called after the wrapper got its new (zoomed) width */
function onWrapperResize() {
    const zoom = appStore.get(zoomAtom);
    if (zoom === lastZoom) return;
    lastZoom = zoom;

    suppressScrollerEvents();
    const scroller = appStore.get(timelineScrollerElementAtom);
    if (!scroller) return;
    if (zoom > 1) {
        const zoomedTargetWidth = scroller.offsetWidth * zoom;
        const scrollLeft = Math.max((appStore.get(commandedTimeAtom) / appStore.get(fileDurationNonZeroAtom)) * zoomedTargetWidth - scroller.offsetWidth / 2, 0);
        scrollAnimation?.stop();
        scroller.scrollLeft = scrollLeft;
    }
    onTimelineScroll();
}

export function timelineScrollerRef(el: HTMLDivElement | null) {
    if (!el) return undefined;
    appStore.set(timelineScrollerElementAtom, el);
    const cancelWheel = (event: WheelEvent) => event.preventDefault();
    el.addEventListener('wheel', cancelWheel, { passive: false });
    return () => {
        el.removeEventListener('wheel', cancelWheel);
        appStore.set(timelineScrollerElementAtom, null);
    };
}

export function timelineWrapperRef(el: HTMLDivElement | null) {
    if (!el) return undefined;
    appStore.set(timelineWrapperElementAtom, el);
    const resizeObserver = new ResizeObserver(onWrapperResize);
    resizeObserver.observe(el);
    return () => {
        resizeObserver.disconnect();
        appStore.set(timelineWrapperElementAtom, null);
    };
}

// Mouse

function getMouseTimelinePos(e: MouseEvent) {
    const target = appStore.get(timelineWrapperElementAtom);
    if (!target) return 0;
    const rect = target.getBoundingClientRect();
    const relX = e.pageX - (rect.left + document.body.scrollLeft);
    return (relX / target.offsetWidth) * appStore.get(fileDurationNonZeroAtom);
}

let mouseDown = false;
let resizingSegment: { operation: 'start' | 'end' | 'move'; offset?: number; } | undefined;

export function onTimelineMouseDown(e: ReactMouseEvent<HTMLElement>) {
    if (e.nativeEvent.buttons !== 1) return; // not primary button

    const mouseTimelinePos = getMouseTimelinePos(e.nativeEvent);
    seekAbs(mouseTimelinePos);

    const currentCutSeg = appStore.get(currentCutSegAtom);
    const fileDurationNonZero = appStore.get(fileDurationNonZeroAtom);

    // start/end handles 1.5% of visible timeline
    const threshold = ((0.01 / 2) * fileDurationNonZero) / appStore.get(zoomAtom);

    if (currentCutSeg != null && currentCutSeg.selected && isModifierPressed(e, userSettings.segmentMouseModifierKey)) {
        if (Math.abs(mouseTimelinePos - currentCutSeg.start) < threshold) {
            resizingSegment = { operation: currentCutSeg.end == null ? 'move' : 'start' }; // move marker or resize segment
        } else if (currentCutSeg.end != null && Math.abs(mouseTimelinePos - currentCutSeg.end) < threshold) {
            resizingSegment = { operation: 'end' };
        } else if (currentCutSeg.end != null && mouseTimelinePos >= currentCutSeg.start && mouseTimelinePos <= currentCutSeg.end) {
            resizingSegment = { operation: 'move', offset: mouseTimelinePos - currentCutSeg.start };
        }
    }

    mouseDown = true;

    function onMouseMove(e2: MouseEvent) {
        if (!mouseDown) return;
        const mouseDragTimelinePos = getMouseTimelinePos(e2);
        seekAbs(mouseDragTimelinePos);
        try {
            if (resizingSegment?.operation === 'start') {
                setCutTime('start', mouseDragTimelinePos);
            } else if (resizingSegment?.operation === 'end') {
                setCutTime('end', mouseDragTimelinePos);
            } else if (resizingSegment?.operation === 'move') {
                setCutTime('move', mouseDragTimelinePos - (resizingSegment.offset ?? 0));
            }
        } catch (err) {
            console.warn('Error while resizing segment:', err instanceof Error ? err.message : err);
        }
    }

    function onMouseUp() {
        mouseDown = false;
        resizingSegment = undefined;
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('mousemove', onMouseMove);
    }

    // https://github.com/mifi/lossless-cut/issues/1432
    window.addEventListener('mouseup', onMouseUp, { once: true });
    window.addEventListener('mousemove', onMouseMove);
}

export function onTimelineMouseMove(e: ReactMouseEvent<HTMLDivElement>) {
    if (!mouseDown) appStore.set(hoveringTimeAtom, getMouseTimelinePos(e.nativeEvent));
    e.preventDefault();
}

export function onTimelineMouseOut() {
    appStore.set(hoveringTimeAtom, undefined);
}
