import { SegmentTagsDialog } from '@/editor/5-segments/index.ts';
import { ValueTuners } from './value-tuners.tsx';

/** Global overlays of the timeline/segments features (value tuners, segment tags editor) */
export function TimelineHosts() {
    return (<>
        <ValueTuners />
        <SegmentTagsDialog />
    </>);
}
