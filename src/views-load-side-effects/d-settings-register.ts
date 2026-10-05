import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { toggleSettings } from '@/editor/1-layout/9-state/panels-atoms.ts';

function register() {
    registerActions({
        toggleSettings,
    });
}

export { register as "d-settings-register" };
