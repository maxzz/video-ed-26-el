// Owner: a-capture port. Public API of the frame capture feature.
import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import * as capture from './7-actions/capture-actions.ts';

export { extractSegmentsFramesAsImages } from './7-actions/capture-actions.ts';
export { CaptureFormatButton } from './0-ui/capture-format-button.tsx';
function register() {
    registerActions({
        captureSnapshot: capture.captureSnapshot,
        captureSnapshotAsCoverArt: capture.captureSnapshotAsCoverArt,
        captureSnapshotToClipboard: capture.captureSnapshotToClipboard,
        extractCurrentSegmentFramesAsImages: capture.extractCurrentSegmentFramesAsImages,
        extractSelectedSegmentsFramesAsImages: capture.extractSelectedSegmentsFramesAsImages,
        toggleCaptureFormat: capture.toggleCaptureFormat,
    });
}

export { register as "a-capture-register" };
