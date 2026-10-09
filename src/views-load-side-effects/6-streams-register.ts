import { registerActions } from "@/editor/0-core/7-actions/kbd-actions";
import { toggleStreamsSelector } from "@/components/2-main/0-all/a-panels-atoms";
import { toggleStripAll, toggleStripAudio, toggleStripSubtitle, toggleStripThumbnail, toggleStripVideo } from "@/editor/6-streams/9-state/a-streams-store";
import { changeEnabledStreamsFilter, showIncludeExternalStreamsDialog, tmcmd_showStreamsSelector, toggleStripCurrentFilter } from "@/editor/6-streams/7-actions/streams-actions";

export function register_6_streams() {
    registerActions({
        toggleStreamsSelector,
        showStreamsSelector: tmcmd_showStreamsSelector,
        showIncludeExternalStreamsDialog,
        toggleStripAudio,
        toggleStripVideo,
        toggleStripSubtitle,
        toggleStripThumbnail,
        toggleStripAll,
        toggleStripCurrentFilter,
        changeEnabledStreamsFilter,
    });
}
