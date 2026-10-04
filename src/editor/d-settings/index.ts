import { registerActions } from '@/editor/0-core/1-actions/actions-registry.ts';
import { toggleSettings } from '@/editor/1-layout/0-state/panels-atoms.ts';

export { SettingsHosts } from './3-ui/settings-hosts.tsx';
export { openSettings } from './1-actions/settings-actions.ts';

registerActions({
    toggleSettings,
});
