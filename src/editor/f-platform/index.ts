// Platform features: update notice, What's new dialog, remote "no file loaded" link.
// The app level actions from upstream App.tsx (openSendReportDialog, quit) are registered by 2-file.
export { openWhatsNewDialog } from "./0-ui/whats-new-dialog";
export { MifiLink } from "./0-ui/mifi-link";
export { newVersionAtom, mifiLinkAtom } from "./9-state/platform";
