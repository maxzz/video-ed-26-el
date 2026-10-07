import { SegmentTagsDialog } from "@/editor/5-segments";
import { ValueTuners } from "./value-tuners";

/** Global overlays of the timeline/segments features (value tuners, segment tags editor) */
export function TimelineHosts() {
    return (<>
        <ValueTuners />
        <SegmentTagsDialog />
    </>);
}
