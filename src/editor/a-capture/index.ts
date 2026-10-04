// Owner: a-capture port. Public API of the frame capture feature.
import { registerActions } from '@/editor/0-core/1-actions/actions-registry.ts';
import * as capture from './1-actions/capture-actions.ts';

export { extractSegmentsFramesAsImages } from './1-actions/capture-actions.ts';
export { CaptureFormatButton } from './3-ui/capture-format-button.tsx';
registerActions({
    captureSnapshot: capture.captureSnapshot,
    captureSnapshotAsCoverArt: capture.captureSnapshotAsCoverArt,
    captureSnapshotToClipboard: capture.captureSnapshotToClipboard,
    extractCurrentSegmentFramesAsImages: capture.extractCurrentSegmentFramesAsImages,
    extractSelectedSegmentsFramesAsImages: capture.extractSelectedSegmentsFramesAsImages,
    toggleCaptureFormat: capture.toggleCaptureFormat,
});
