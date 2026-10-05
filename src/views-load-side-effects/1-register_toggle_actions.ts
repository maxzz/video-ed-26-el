import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { toggleSegmentsList } from '@/editor/1-layout/9-state/layout-atoms.ts';
import { toggleDarkMode } from '@/utils/local-utils/theme-sync.ts';

export function register_1_toggle_actions() {
    registerActions({
        toggleSegmentsList,
        toggleDarkMode,
    });
}
