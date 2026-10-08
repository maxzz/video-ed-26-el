// Platform features: update notice, What's new dialog, remote "no file loaded" link.
// The app level actions from upstream App.tsx (openSendReportDialog, quit) are registered by 2-file.
export { openDialog_WhatsNew as openWhatsNewDialog } from "./0-ui/1-dlg-whats-new";
export { newVersionAtom, mifiLinkAtom } from "./9-state/a-platform";
