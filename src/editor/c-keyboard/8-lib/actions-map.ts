import i18n from "i18next";
import orderBy from "lodash/orderBy.js";
import uniq from "lodash/uniq.js";
import { type KeyboardAction, type ModifierKey } from "@shared/types";
import { allModifiers, altModifiers, controlModifiers, getMetaKeyName, metaModifiers, shiftModifiers } from "@/editor/0-core/8-lib/utils-kbd";

// Port of the actionsMap of upstream KeyboardShortcuts.tsx. Titles are shared by the shortcuts dialog and the command palette.

export interface ActionInfo {
    name: string;
    category?: string | undefined;
}

export type ActionsMap = Record<KeyboardAction, ActionInfo>;

export function getActionCategories() {
    const t = i18n.t.bind(i18n);
    return {
        playback: t('Playback'),
        selectivePlayback: t('Playback/preview segments only'),
        seeking: t('Seeking'),
        segmentsAndCutpoints: t('Segments and cut points'),
        zoomOperations: t('Timeline/zoom operations'),
        output: t('Output actions'),
        batchFiles: t('Batch file list'),
        other: t('Other operations'),
        streams: t('Tracks'),
    };
}

export function getActionsMap(): ActionsMap {
    const t = i18n.t.bind(i18n);
    const c = getActionCategories();

    return {
        toggleLastCommands: { name: t('Last ffmpeg commands') },
        toggleKeyboardShortcuts: { name: t('Keyboard & mouse shortcuts') },
        toggleCommandPalette: { name: t('Command palette') },

        togglePlayResetSpeed: { name: t('Play/pause'), category: c.playback },
        togglePlayNoResetSpeed: { name: t('Play/pause (no reset speed)'), category: c.playback },
        play: { name: t('Play'), category: c.playback },
        pause: { name: t('Pause'), category: c.playback },
        increasePlaybackRate: { name: t('Speed up playback'), category: c.playback },
        reducePlaybackRate: { name: t('Slow down playback'), category: c.playback },
        increasePlaybackRateMore: { name: t('Speed up playback more'), category: c.playback },
        reducePlaybackRateMore: { name: t('Slow down playback more'), category: c.playback },
        increaseVolume: { name: t('Increase audio volume'), category: c.playback },
        decreaseVolume: { name: t('Decrease audio volume'), category: c.playback },
        toggleMuted: { name: t('Mute preview'), category: c.playback },
        reloadFile: { name: t('Reload current media'), category: c.playback },
        html5ify: { name: t('Convert to supported format'), category: c.playback },
        makeCursorTimeZero: { name: t('Make cursor time zero'), category: c.playback },

        togglePlayOnlyCurrentSegment: { name: t('Play current segment once'), category: c.selectivePlayback },
        toggleLoopOnlyCurrentSegment: { name: t('Loop current segment'), category: c.selectivePlayback },
        toggleLoopStartEndOnlyCurrentSegment: { name: t('Loop beginning and end of current segment'), category: c.selectivePlayback },
        togglePlaySelectedSegments: { name: t('Play selected segments in order'), category: c.selectivePlayback },
        toggleLoopSelectedSegments: { name: t('Loop selected segments in order'), category: c.selectivePlayback },

        seekPreviousFrame: { name: t('Step backward 1 frame'), category: c.seeking },
        seekNextFrame: { name: t('Step forward 1 frame'), category: c.seeking },
        seekBackwards: { name: t('Backward seek'), category: c.seeking },
        seekForwards: { name: t('Forward seek'), category: c.seeking },
        seekBackwards2: { name: t('Backward seek (longer)'), category: c.seeking },
        seekForwards2: { name: t('Forward seek (longer)'), category: c.seeking },
        seekBackwards3: { name: t('Backward seek (longest)'), category: c.seeking },
        seekForwards3: { name: t('Forward seek (longest)'), category: c.seeking },
        seekBackwardsKeyframe: { name: t('Seek previous keyframe'), category: c.seeking },
        seekForwardsKeyframe: { name: t('Seek next keyframe'), category: c.seeking },
        seekBackwardsPercent: { name: t('Seek backward 1% of timeline at current zoom'), category: c.seeking },
        seekForwardsPercent: { name: t('Seek forward 1% of timeline at current zoom'), category: c.seeking },
        jumpCutStart: { name: t('Jump to current segment\'s start time'), category: c.seeking },
        jumpCutEnd: { name: t('Jump to current segment\'s end time'), category: c.seeking },
        jumpTimelineStart: { name: t('Jump to start of video'), category: c.seeking },
        jumpTimelineEnd: { name: t('Jump to end of video'), category: c.seeking },
        goToTimecode: { name: t('Seek to timecode'), category: c.seeking },

        addSegment: { name: t('Add cut segment'), category: c.segmentsAndCutpoints },
        removeCurrentCutpoint: { name: t('Remove current segment cutpoint'), category: c.segmentsAndCutpoints },
        removeCurrentSegment: { name: t('Remove current segment'), category: c.segmentsAndCutpoints },
        setCutStart: { name: t('Start current segment at current time'), category: c.segmentsAndCutpoints },
        setCutEnd: { name: t('End current segment at current time'), category: c.segmentsAndCutpoints },
        labelCurrentSegment: { name: t('Label current segment'), category: c.segmentsAndCutpoints },
        editCurrentSegmentTags: { name: t('Edit current segment tags'), category: c.segmentsAndCutpoints },
        splitCurrentSegment: { name: t('Split segment at cursor'), category: c.segmentsAndCutpoints },
        focusSegmentAtCursor: { name: t('Focus segment at cursor'), category: c.segmentsAndCutpoints },
        selectSegmentsAtCursor: { name: t('Select segments at cursor'), category: c.segmentsAndCutpoints },
        duplicateCurrentSegment: { name: t('Duplicate current segment'), category: c.segmentsAndCutpoints },
        jumpPrevSegment: { name: t('Jump to previous segment'), category: c.segmentsAndCutpoints },
        jumpSeekPrevSegment: { name: t('Jump & seek to previous segment'), category: c.segmentsAndCutpoints },
        jumpNextSegment: { name: t('Jump to next segment'), category: c.segmentsAndCutpoints },
        jumpSeekNextSegment: { name: t('Jump & seek to next segment'), category: c.segmentsAndCutpoints },
        jumpFirstSegment: { name: t('Jump to first segment'), category: c.segmentsAndCutpoints },
        jumpSeekFirstSegment: { name: t('Jump & seek to first segment'), category: c.segmentsAndCutpoints },
        jumpLastSegment: { name: t('Jump to last segment'), category: c.segmentsAndCutpoints },
        jumpSeekLastSegment: { name: t('Jump & seek to last segment'), category: c.segmentsAndCutpoints },
        reorderSegsByStartTime: { name: t('Reorder segments by start time'), category: c.segmentsAndCutpoints },
        invertAllSegments: { name: t('Invert all segments on timeline'), category: c.segmentsAndCutpoints },
        fillSegmentsGaps: { name: t('Fill gaps between segments'), category: c.segmentsAndCutpoints },
        shiftAllSegmentTimes: { name: t('Shift all segments on timeline'), category: c.segmentsAndCutpoints },
        alignSegmentTimesToKeyframes: { name: t('Align segment times to keyframes'), category: c.segmentsAndCutpoints },
        createSegmentsFromKeyframes: { name: t('Create segments from keyframes'), category: c.segmentsAndCutpoints },
        createFixedDurationSegments: { name: t('Create fixed duration segments'), category: c.segmentsAndCutpoints },
        createNumSegments: { name: t('Create num segments'), category: c.segmentsAndCutpoints },
        createFixedByteSizedSegments: { name: t('Create byte sized segments'), category: c.segmentsAndCutpoints },
        createRandomSegments: { name: t('Create random segments'), category: c.segmentsAndCutpoints },
        detectBlackScenes: { name: t('Detect black scenes'), category: c.segmentsAndCutpoints },
        detectSilentScenes: { name: t('Detect silent scenes'), category: c.segmentsAndCutpoints },
        detectSceneChanges: { name: t('Detect scene changes'), category: c.segmentsAndCutpoints },
        shuffleSegments: { name: t('Shuffle segments order'), category: c.segmentsAndCutpoints },
        combineOverlappingSegments: { name: t('Combine overlapping segments'), category: c.segmentsAndCutpoints },
        combineSelectedSegments: { name: t('Combine selected segments') },
        clearSegments: { name: t('Clear all segments'), category: c.segmentsAndCutpoints },
        toggleSegmentsList: { name: t('Show sidebar'), category: c.segmentsAndCutpoints },
        selectOnlyCurrentSegment: { name: t('Select only this segment'), category: c.segmentsAndCutpoints },
        toggleCurrentSegmentSelected: { name: t('Toggle current segment selected'), category: c.segmentsAndCutpoints },
        deselectAllSegments: { name: t('Deselect all segments'), category: c.segmentsAndCutpoints },
        selectAllSegments: { name: t('Select all segments'), category: c.segmentsAndCutpoints },
        selectAllMarkers: { name: t('Select all markers'), category: c.segmentsAndCutpoints },
        selectSegmentsByLabel: { name: t('Select segments by label'), category: c.segmentsAndCutpoints },
        selectSegmentsByExpr: { name: t('Select segments by expression'), category: c.segmentsAndCutpoints },
        labelSelectedSegments: { name: t('Label selected segments'), category: c.segmentsAndCutpoints },
        invertSelectedSegments: { name: t('Invert selected segments'), category: c.segmentsAndCutpoints },
        removeSelectedSegments: { name: t('Remove selected segments'), category: c.segmentsAndCutpoints },
        mutateSegmentsByExpr: { name: t('Edit segments by expression'), category: c.segmentsAndCutpoints },

        toggleStreamsSelector: { name: t('Edit tracks / metadata tags'), category: c.streams },
        extractAllStreams: { name: t('Extract all tracks'), category: c.streams },
        showStreamsSelector: { name: t('Edit tracks / metadata tags'), category: c.streams },
        showIncludeExternalStreamsDialog: { name: t('Include more tracks from other file'), category: c.streams },

        timelineZoomIn: { name: t('Zoom in timeline'), category: c.zoomOperations },
        timelineZoomOut: { name: t('Zoom out timeline'), category: c.zoomOperations },
        timelineToggleComfortZoom: { name: t('Toggle zoom between 1x and a calculated comfortable zoom level'), category: c.zoomOperations },

        export: { name: t('Export segment(s)'), category: c.output },
        captureSnapshot: { name: t('Capture snapshot'), category: c.output },
        captureSnapshotAsCoverArt: { name: t('Set current frame as cover art'), category: c.output },
        captureSnapshotToClipboard: { name: t('Capture snapshot to clipboard'), category: c.output },
        exportYouTube: { name: t('Start times as YouTube Chapters'), category: c.output },
        extractCurrentSegmentFramesAsImages: { name: t('Extract frames from current segment as image files'), category: c.output },
        extractSelectedSegmentsFramesAsImages: { name: t('Extract frames from selected segments as image files'), category: c.output },
        cleanupFilesDialog: { name: t('Delete source file'), category: c.output },
        convertFormatBatch: { name: t('Batch convert files to supported format'), category: c.output },
        convertFormatCurrentFile: { name: t('Convert current file to supported format'), category: c.output },
        fixInvalidDuration: { name: t('Fix incorrect duration'), category: c.output },
        decimate: { name: t('Decimate video'), category: c.output },

        batchPreviousFile: { name: t('Previous file'), category: c.batchFiles },
        batchOpenPreviousFile: { name: t('Open previous file'), category: c.batchFiles },
        batchNextFile: { name: t('Next file'), category: c.batchFiles },
        batchOpenNextFile: { name: t('Open next file'), category: c.batchFiles },
        batchOpenSelectedFile: { name: t('Open selected file'), category: c.batchFiles },
        closeBatch: { name: t('Close batch'), category: c.batchFiles },
        concatBatch: { name: t('Merge/concatenate files'), category: c.batchFiles },

        toggleKeyframeCutMode: { name: t('Cut mode'), category: c.other },
        toggleCaptureFormat: { name: t('Capture frame format'), category: c.other },
        toggleStripAudio: { name: t('Keep or discard audio tracks'), category: c.other },
        toggleStripVideo: { name: t('Keep or discard video tracks'), category: c.other },
        toggleStripSubtitle: { name: t('Keep or discard subtitle tracks'), category: c.other },
        toggleStripThumbnail: { name: t('Keep or discard thumbnail tracks'), category: c.other },
        toggleStripAll: { name: t('Keep or discard all tracks'), category: c.other },
        toggleStripCurrentFilter: { name: t('Toggle tracks using current filter'), category: c.other },
        increaseRotation: { name: t('Change rotation'), category: c.other },
        setStartTimeOffset: { name: t('Set custom start offset/timecode'), category: c.other },
        undo: { name: t('Undo'), category: c.other },
        redo: { name: t('Redo'), category: c.other },
        copySegmentsToClipboard: { name: t('Copy selected segments times to clipboard'), category: c.other },
        toggleWaveformMode: { name: t('Show waveform'), category: c.other },
        generateOverviewWaveform: { name: t('Load overview'), category: c.other },
        toggleShowThumbnails: { name: t('Show thumbnails'), category: c.other },
        toggleShowKeyframes: { name: t('Show keyframes'), category: c.other },
        readAllKeyframes: { name: t('Read all keyframes'), category: c.other },
        toggleFullscreenVideo: { name: 'Toggle full screen video', category: c.other },
        toggleSettings: { name: t('Settings'), category: c.other },
        toggleDarkMode: { name: t('Toggle dark mode'), category: c.other },
        openSendReportDialog: { name: t('Report an error'), category: c.other },
        openFilesDialog: { name: t('Open'), category: c.other },
        openDirDialog: { name: t('Open folder'), category: c.other },
        closeCurrentFile: { name: t('Close current file'), category: c.other },
        quit: { name: t('Quit LosslessCut'), category: c.other },
    };
}

/** Titles of registered actions that cannot be bound to keys (menu/API only), shown in the command palette */
export function getExtraActionsMap(): Record<string, ActionInfo> {
    const t = i18n.t.bind(i18n);
    const c = getActionCategories();
    return {
        toggleCommandPalette: { name: t('Command palette') },
        promptDownloadMediaUrl: { name: t('Open URL'), category: c.other },
    };
}

/** Registered actions that need arguments and so cannot be run from the command palette */
export const actionsWithArgs = new Set(['openFiles', 'importEdlFile', 'exportEdlFile', 'toggleCommandPalette']);

/** Fallback title for actions without a translated name: `fooBarBaz` -> `Foo bar baz` */
export function humanizeActionName(name: string) {
    const words = name.replaceAll(/([a-z\d])([A-Z])/g, '$1 $2').toLowerCase();
    return words.charAt(0).toUpperCase() + words.slice(1);
}

export const getModifierKeyNames = (): Record<ModifierKey, string> => ({
    ctrl: i18n.t('Ctrl'),
    shift: i18n.t('Shift'),
    alt: i18n.t('Alt'),
    meta: getMetaKeyName(),
});

export const getModifier = (key: ModifierKey) => getModifierKeyNames()[key];

/**
 * Normalizes pressed key codes to a binding: modifiers first (shift, ctrl, alt, meta), then the single non-modifier key.
 * Returns [] if the combination is invalid (only modifiers, or more than one non-modifier key).
 */
export function fixKeys(keys: string[]) {
    const uniqed = uniq(keys);
    const nonModifierKeys = keys.filter((key) => !allModifiers.has(key));
    if (nonModifierKeys.length !== 1) return [];
    return orderBy(uniqed, [
        (key) => !shiftModifiers.has(key),
        (key) => !controlModifiers.has(key),
        (key) => !altModifiers.has(key),
        (key) => !metaModifiers.has(key),
        (key) => key,
    ]);
}
