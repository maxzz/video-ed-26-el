import type { ColorInstance } from 'color';
import { useAtomValue } from 'jotai';
import { AnimatePresence, motion, type MotionStyle } from 'motion/react';
import { SaveIcon, Trash2Icon } from 'lucide-react';
import type { StateSegment } from '@/editor/0-core/8-lib/types.ts';
import { effectiveExportModeAtom, prefersReducedMotionAtom } from '@/editor/0-core/9-state/user-settings.ts';
import { formatTimecodeAtom } from '@/editor/0-core/9-state/timecode.ts';
import { fileDurationNonZeroAtom } from '@/editor/2-file/9-state/file-atoms.ts';
import { currentSegIndexSafeAtom, cutSegmentsAtom, inverseCutSegmentsAtom } from '@/editor/5-segments/9-state/segments-store.ts';
import { darkModeAtom, getSegColorAtom, invertCutSegmentsAtom, springAnimationAtom } from '@/editor/5-segments/9-state/seg-ui-atoms.ts';
import { setCurrentSegIndex } from '@/editor/5-segments/7-actions/segment-actions.ts';

// Port of upstream TimelineSeg.tsx and BetweenSegments.tsx

export function TimelineSegments() {
    const cutSegments = useAtomValue(cutSegmentsAtom);
    const currentSegIndexSafe = useAtomValue(currentSegIndexSafeAtom);
    const invertCutSegments = useAtomValue(invertCutSegmentsAtom);
    const fileDurationNonZero = useAtomValue(fileDurationNonZeroAtom);
    const getSegColor = useAtomValue(getSegColorAtom);

    return (
        <AnimatePresence>
            {cutSegments.map((seg, i) => (
                <SegmentOrMarker
                    key={seg.segId}
                    seg={seg}
                    segNum={i}
                    color={getSegColor(seg)}
                    isActive={i === currentSegIndexSafe}
                    selected={invertCutSegments || seg.selected}
                    invertCutSegments={invertCutSegments}
                    fileDurationNonZero={fileDurationNonZero}
                />
            ))}
        </AnimatePresence>
    );
}

interface SegProps {
    seg: StateSegment;
    segNum: number;
    color: ColorInstance;
    isActive: boolean;
    selected: boolean;
    invertCutSegments: boolean;
    fileDurationNonZero: number;
}

function SegmentOrMarker(props: SegProps) {
    if (props.seg.end != null) return <Segment {...props} end={props.seg.end} />;
    return <Marker {...props} />;
}

function Marker({ seg, segNum, color, isActive, selected, fileDurationNonZero }: SegProps) {
    const darkMode = useAtomValue(darkModeAtom);
    const prefersReducedMotion = useAtomValue(prefersReducedMotionAtom);
    const springAnimation = useAtomValue(springAnimationAtom);
    const formatTimecode = useAtomValue(formatTimecodeAtom);

    const pinColor = darkMode ? color.saturate(0.2).lightness(40).string() : color.desaturate(0.2).lightness(50).string();
    const activeBorder = darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    const title = [formatTimecode({ seconds: seg.start, shorten: true }), ...(seg.name ? [seg.name] : [])].join(' ');

    return (
        <motion.div
            className="absolute inset-y-0 -ml-px w-0.5 bg-foreground overflow-visible"
            style={{ left: `${(seg.start / fileDurationNonZero) * 100}%` }}
            layout={!prefersReducedMotion}
            transition={springAnimation}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: selected ? 1 : 0.5, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            title={title}
        >
            <div
                className="shrink-0 -ml-1.75 size-3.5 text-center rounded-full"
                style={{ backgroundColor: pinColor, border: `1px solid ${isActive ? activeBorder : 'transparent'}` }}
            >
                <div role="button" className="min-w-0 text-[10px] -tracking-widest text-white" onClick={() => setCurrentSegIndex(segNum)}>
                    {segNum + 1}
                </div>
            </div>
        </motion.div>
    );
}

function Segment({ seg, end, segNum, color, isActive, selected, invertCutSegments, fileDurationNonZero }: SegProps & { end: number; }) {
    const darkMode = useAtomValue(darkModeAtom);
    const prefersReducedMotion = useAtomValue(prefersReducedMotionAtom);
    const springAnimation = useAtomValue(springAnimationAtom);
    const formatTimecode = useAtomValue(formatTimecodeAtom);
    const { name } = seg;

    let border = { horizontal: '1px solid transparent', vertical: '1.5px solid transparent' };
    if (isActive) {
        const horizontalColor = darkMode ? color.desaturate(0.1).lightness(60) : color.desaturate(0.2).lightness(40);
        const verticalColor = darkMode ? color.desaturate(0.1).lightness(90) : color.desaturate(0.2).lightness(10);
        border = { horizontal: `1px solid ${horizontalColor.string()}`, vertical: `1.5px solid ${verticalColor.string()}` };
    }

    // we use both transparency and lightness, so that segments can be visible when overlapping
    let backgroundColor: string;
    if (invertCutSegments || !selected) backgroundColor = darkMode ? color.desaturate(0.3).lightness(30).alpha(0.5).string() : color.desaturate(0.3).lightness(70).alpha(0.5).string();
    else if (isActive) backgroundColor = darkMode ? color.saturate(0.2).lightness(60).alpha(0.7).string() : color.saturate(0.2).lightness(40).alpha(0.8).string();
    else backgroundColor = darkMode ? color.desaturate(0.2).lightness(50).alpha(0.7).string() : color.lightness(35).alpha(0.6).string();

    const title = [
        formatTimecode({ seconds: seg.start, shorten: true }),
        `- ${formatTimecode({ seconds: end, shorten: true })}`,
        ...(name ? [name] : []),
    ].join(' ');

    const style: MotionStyle = {
        left: `${(seg.start / fileDurationNonZero) * 100}%`,
        width: `${((end - seg.start) / fileDurationNonZero) * 100}%`,
        originX: 0,
        backgroundColor,
        borderLeft: border.vertical,
        borderRight: border.vertical,
        borderTop: border.horizontal,
        borderBottom: border.horizontal,
    };

    return (
        <motion.div
            className="absolute inset-y-0 text-white rounded-[5px] overflow-hidden flex items-center justify-between"
            style={style}
            layout={!prefersReducedMotion}
            transition={springAnimation}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1, backgroundColor }}
            exit={{ opacity: 0, scaleX: 0 }}
            role="button"
            onClick={() => setCurrentSegIndex(segNum)}
            title={title}
        >
            <div className="self-start shrink-0 min-w-0 text-[10px] -tracking-widest">{segNum + 1}</div>

            <AnimatePresence>
                {invertCutSegments && (
                    <motion.div key="trash" className="shrink" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        <Trash2Icon className="mr-0.5 w-full min-w-[.4em] block text-white" />
                    </motion.div>
                )}
                {!invertCutSegments && !name && (
                    <motion.div key="save" className="shrink" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        <SaveIcon className="mr-0.5 w-full min-w-[.4em] block text-white" />
                    </motion.div>
                )}
            </AnimatePresence>

            {name && <div className="shrink basis-1" />}
            {name && <div className="shrink whitespace-nowrap min-w-0 text-[11px] overflow-hidden">{name}</div>}

            <div className="grow" />
        </motion.div>
    );
}

export function BetweenSegmentsList() {
    const inverseCutSegments = useAtomValue(inverseCutSegmentsAtom);
    const fileDurationNonZero = useAtomValue(fileDurationNonZeroAtom);
    const invertCutSegments = useAtomValue(invertCutSegmentsAtom);
    const effectiveExportMode = useAtomValue(effectiveExportModeAtom);
    const prefersReducedMotion = useAtomValue(prefersReducedMotionAtom);
    const springAnimation = useAtomValue(springAnimationAtom);

    return inverseCutSegments.map(({ segId, start, end }) => {
        const left = `${(start / fileDurationNonZero) * 100}%`;
        return (
            <motion.div
                key={segId}
                className="absolute inset-y-0 flex items-center pointer-events-none"
                initial={{ left, width: '0%' }}
                animate={{ left, width: `${((end - start) / fileDurationNonZero) * 100}%` }}
                layout={!prefersReducedMotion}
                transition={springAnimation}
            >
                <div className="grow mx-1.25 border-b border-dashed border-muted-foreground" />
                {/* https://github.com/mifi/lossless-cut/issues/2157 */}
                {effectiveExportMode !== 'segments_to_chapters' && (
                    <>
                        {invertCutSegments
                            ? <SaveIcon className="shrink-0 size-4 text-green-600 dark:text-green-400" />
                            : <Trash2Icon className="shrink-0 size-4 text-muted-foreground" />}
                        <div className="grow mx-1.25 border-b border-dashed border-muted-foreground" />
                    </>
                )}
            </motion.div>
        );
    });
}
