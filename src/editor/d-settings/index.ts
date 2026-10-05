import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import { toggleSettings } from '@/editor/1-layout/9-state/panels-atoms.ts';

export { SettingsHosts } from './0-ui/settings-hosts.tsx';
export { openSettings } from './7-actions/settings-actions.ts';

registerActions({
    toggleSettings,
});
