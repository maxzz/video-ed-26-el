import { registerActions } from '@/editor/0-core/7-actions/actions-registry.ts';
import { toggleSegmentsList } from './9-state/layout-atoms.ts';
import { toggleDarkMode } from './8-lib/theme-sync.ts';

export { EditorRoot } from './0-ui/editor-root.tsx';
export { initThemeSync } from './8-lib/theme-sync.ts';

registerActions({
    toggleSegmentsList,
    toggleDarkMode,
});
