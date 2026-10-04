// Owner: 7-export + 6-streams port. Public API of the streams feature (tracks editor, tags, GPS map).
import { registerActions } from '@/editor/0-core/1-actions/actions-registry.ts';
import { toggleStreamsSelector } from '@/editor/1-layout/0-state/panels-atoms.ts';
import { toggleStripAll, toggleStripAudio, toggleStripSubtitle, toggleStripThumbnail, toggleStripVideo } from './0-state/streams-store.ts';
import { changeEnabledStreamsFilter, showIncludeExternalStreamsDialog, showStreamsSelector, toggleStripCurrentFilter } from './1-actions/streams-actions.tsx';

export { StreamsSelector } from './3-ui/streams-selector.tsx';
export { TagEditor } from './3-ui/tag-editor.tsx';
export { GpsMap } from './3-ui/gps-map.tsx';
export { Json5Dialog } from './3-ui/json-dialog.tsx';
export { addStreamSourceFile, updateStreamParams, updateFileParams, removeExternalFile, showIncludeExternalStreamsDialog, changeEnabledStreamsFilter, showStreamsSelector } from './1-actions/streams-actions.tsx';

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
