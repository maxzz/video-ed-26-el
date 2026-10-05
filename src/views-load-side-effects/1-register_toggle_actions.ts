import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { toggleSegmentsList } from '@/components/2-main/0-all/a-layout-atoms';
import { toggleDarkMode } from '@/utils/local-utils/theme-sync.ts';

export function register_1_toggle_actions() {
    registerActions({
        toggleSegmentsList,
        toggleDarkMode,
    });
}
