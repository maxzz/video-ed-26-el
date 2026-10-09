import { registerActions } from "@/editor/0-core/7-actions/kbd-actions";
import * as capture from "@/editor/a-capture-frame/7-actions/capture-actions";

export function register_a_capture_frame() {
    registerActions({
        captureSnapshot: capture.captureSnapshot,
        captureSnapshotAsCoverArt: capture.captureSnapshotAsCoverArt,
        captureSnapshotToClipboard: capture.captureSnapshotToClipboard,
        extractCurrentSegmentFramesAsImages: capture.extractCurrentSegmentFramesAsImages,
        extractSelectedSegmentsFramesAsImages: capture.extractSelectedSegmentsFramesAsImages,
        toggleCaptureFormat: capture.toggleCaptureFormat,
    });
}
