import type { MouseEvent, WheelEvent } from 'react';
import { atom, useAtomValue } from 'jotai';
import { observe } from 'jotai-effect';
import { CircleAlertIcon, LoaderCircleIcon } from 'lucide-react';
import { cn } from '@/utils/classnames';
import { appStore } from '@/components/4-dialogs/7-0-dialogs/store.ts';
import { ffmpegExtractWindow } from '@/editor/0-core/8-lib/constants.ts';
import { fileDurationNonZeroAtom } from '@/editor/2-file/9-state/a-file-atoms.ts';
import { playingAtom, relevantTimeAtom } from '@/editor/3-player/9-state/player-atoms.ts';
import { seekRel } from '@/editor/3-player/7-actions/player-actions.ts';
import { darkModeAtom } from '@/editor/5-segments/9-state/seg-ui-atoms.ts';
import { bigWaveformEnabledAtom, waveformsAtom, zoomUnroundedAtom } from '../9-state/timeline-atoms.ts';

// Port of upstream BigWaveform.tsx. Rendered by the player area when bigWaveformEnabledAtom is true.

const windowSize = ffmpegExtractWindow * 2;

/** While playing, the time is extrapolated every animation frame because the player time updates less often */
const smoothTimeAtom = atom<number | undefined>(undefined);

observe((get, set) => {
    const relevantTime = get(relevantTimeAtom);
    if (!get(bigWaveformEnabledAtom) || !get(playingAtom)) {
        set(smoothTimeAtom, undefined);
        return undefined;
    }
    const startTime = Date.now();
    let raf = 0;
    function render() {
        raf = window.requestAnimationFrame(() => {
            appStore.set(smoothTimeAtom, relevantTime + (Date.now() - startTime) / 1000);
            render();
        });
    }
    render();
    return () => window.cancelAnimationFrame(raf);
}, appStore);

const effectiveTimeAtom = atom((get) => get(smoothTimeAtom) ?? get(relevantTimeAtom));

const visibleWaveformsAtom = atom((get) => {
    const relevantTime = get(relevantTimeAtom);
    const windowStart = Math.max(0, relevantTime - windowSize);
    const windowEnd = relevantTime + windowSize;
    return get(waveformsAtom).filter((waveform) => waveform.from >= windowStart && waveform.to <= windowEnd);
});

let dragging = false;
let containerElement: HTMLDivElement | null = null;

function scaleToTime(v: number) {
    const width = containerElement?.getBoundingClientRect().width || 1;
    return ((v / width) * windowSize) / appStore.get(zoomUnroundedAtom);
}

function handleMouseDown(e: MouseEvent<HTMLDivElement>) {
    dragging = true;
    e.preventDefault();
}

function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!dragging) return;
    seekRel(-scaleToTime(e.movementX));
    e.preventDefault();
}

function handleMouseUp(e: MouseEvent<HTMLDivElement>) {
    if (!dragging) return;
    dragging = false;
    e.preventDefault();
}

function handleWheel(e: WheelEvent<HTMLDivElement>) {
    seekRel(scaleToTime(e.deltaX));
}

export function BigWaveform() {
    const waveforms = useAtomValue(visibleWaveformsAtom);
    const smoothTime = useAtomValue(effectiveTimeAtom);
    const zoom = useAtomValue(zoomUnroundedAtom);
    const fileDurationNonZero = useAtomValue(fileDurationNonZeroAtom);
    const darkMode = useAtomValue(darkModeAtom);

    return (
        <div
            ref={(el) => { containerElement = el; }}
            className="relative size-full bg-muted cursor-grab"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove}
            onWheel={handleWheel}
        >
            {waveforms.map((waveform) => {
                const left = 0.5 + ((waveform.from - smoothTime) / windowSize) * zoom;
                const width = ((waveform.to - waveform.from) / windowSize) * zoom;
                const className = cn(
                    'absolute h-full border-muted-foreground pointer-events-none',
                    waveform.from === 0 && 'border-l',
                    waveform.to >= fileDurationNonZero && 'border-r',
                    !darkMode && 'invert',
                );
                const style = { left: `${left * 100}%`, width: `${width * 100}%` };

                if (waveform.url == null || waveform.failed) {
                    return (
                        <div key={`${waveform.from}-${waveform.to}`} className={cn(className, 'flex items-center justify-center')} style={style}>
                            {waveform.failed ? <CircleAlertIcon className="text-destructive" /> : <LoaderCircleIcon className="animate-spin" />}
                        </div>
                    );
                }

                return <img key={`${waveform.from}-${waveform.to}`} src={waveform.url} draggable={false} alt="" className={className} style={style} />;
            })}

            <div className="absolute top-0 left-1/2 w-px h-full bg-destructive pointer-events-none" />
        </div>
    );
}
