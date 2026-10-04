// Platform features: update notice, What's new dialog, remote "no file loaded" link.
// The app level actions from upstream App.tsx (openSendReportDialog, quit) are registered by 2-file.
import { onAppReady } from '@/editor/0-core/7-actions/lifecycle.ts';
import { initPlatform } from './7-actions/startup.ts';

export { openWhatsNewDialog } from './0-ui/whats-new-dialog.tsx';
export { MifiLink } from './0-ui/mifi-link.tsx';
export { newVersionAtom, mifiLinkAtom } from './9-state/platform.ts';

onAppReady(initPlatform);
