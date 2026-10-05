import { registerActions } from '@/editor/0-core/7-actions/kbd-actions.ts';
import * as capture from '@/editor/a-capture/7-actions/capture-actions.ts';

export function register_a_capture() {
    registerActions({
        captureSnapshot: capture.captureSnapshot,
        captureSnapshotAsCoverArt: capture.captureSnapshotAsCoverArt,
        captureSnapshotToClipboard: capture.captureSnapshotToClipboard,
        extractCurrentSegmentFramesAsImages: capture.extractCurrentSegmentFramesAsImages,
        extractSelectedSegmentsFramesAsImages: capture.extractSelectedSegmentsFramesAsImages,
        toggleCaptureFormat: capture.toggleCaptureFormat,
    });
}
