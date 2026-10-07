import { Dialog_SegmentTags } from "@/editor/5-segments/0-ui/dlg-segment-tags";
import { ValueTuners } from "./4-value-tuners";

/** Global overlays of the timeline/segments features (value tuners, segment tags editor) */
export function TimelineHosts() {
    return (<>
        <ValueTuners />
        <Dialog_SegmentTags />
    </>);
}
