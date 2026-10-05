// Owner: 7-export + 6-streams port. Public API of the streams feature (tracks editor, tags, GPS map).
import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { toggleStreamsSelector } from '@/editor/1-layout/9-state/panels-atoms.ts';
import { toggleStripAll, toggleStripAudio, toggleStripSubtitle, toggleStripThumbnail, toggleStripVideo } from './9-state/streams-store.ts';
import { changeEnabledStreamsFilter, showIncludeExternalStreamsDialog, showStreamsSelector, toggleStripCurrentFilter } from './7-actions/streams-actions.tsx';

export { StreamsSelector } from './0-ui/streams-selector.tsx';
export { TagEditor } from './0-ui/tag-editor.tsx';
export { GpsMap } from './0-ui/gps-map.tsx';
export { Json5Dialog } from './0-ui/json-dialog.tsx';
export { addStreamSourceFile, updateStreamParams, updateFileParams, removeExternalFile, showIncludeExternalStreamsDialog, changeEnabledStreamsFilter, showStreamsSelector } from './7-actions/streams-actions.tsx';

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
