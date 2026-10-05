import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { toggleStreamsSelector } from '@/editor/1-layout/9-state/panels-atoms.ts';
import { toggleStripAll, toggleStripAudio, toggleStripSubtitle, toggleStripThumbnail, toggleStripVideo } from '@/editor/6-streams/9-state/streams-store.ts';
import { changeEnabledStreamsFilter, showIncludeExternalStreamsDialog, showStreamsSelector, toggleStripCurrentFilter } from '@/editor/6-streams/7-actions/streams-actions.tsx';

export function register_6_streams() {
    registerActions({
        toggleStreamsSelector,
        showStreamsSelector,
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
