import { registerActions } from '@/editor/0-core/1-actions/actions-registry.ts';
import { toggleSegmentsList } from './0-state/layout-atoms.ts';
import { toggleDarkMode } from './2-lib/theme-sync.ts';

export { EditorRoot } from './3-ui/editor-root.tsx';
export { initThemeSync } from './2-lib/theme-sync.ts';

registerActions({
    toggleSegmentsList,
    toggleDarkMode,
});
