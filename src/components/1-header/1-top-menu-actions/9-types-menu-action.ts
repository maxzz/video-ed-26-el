import { type HostMenuAction } from "@shared/ipc-contract";
import { type EdlExportType, type EdlImportType } from "@/editor/0-core/8-lib/9-types-core";
import { type EditCommand } from "@/editor/0-core/8-lib/edit-command";

/** Every application-menu command. `what` selects it; other fields are that command's parameters. */
export type MenuAction =
    | HostMenuAction
    | { what: 'edit'; command: EditCommand; }
    | { what: 'undo'; }
    | { what: 'redo'; }
    | { what: 'openFilesDialog'; }
    | { what: 'openDirDialog'; }
    | { what: 'promptDownloadMediaUrl'; }
    | { what: 'closeCurrentFile'; }
    | { what: 'closeBatch'; }
    | { what: 'importEdlFile'; format: EdlImportType; }
    | { what: 'exportEdlFile'; format: EdlExportType; }
    | { what: 'exportYouTube'; }
    | { what: 'html5ify'; }
    | { what: 'fixInvalidDuration'; }
    | { what: 'decimate'; }
    | { what: 'toggleSettings'; }
    | { what: 'extractAllStreams'; }
    | { what: 'showStreamsSelector'; }
    | { what: 'createNumSegments'; }
    | { what: 'createFixedDurationSegments'; }
    | { what: 'createFixedByteSizedSegments'; }
    | { what: 'createRandomSegments'; }
    | { what: 'reorderSegsByStartTime'; }
    | { what: 'shuffleSegments'; }
    | { what: 'combineOverlappingSegments'; }
    | { what: 'combineSelectedSegments'; }
    | { what: 'splitCurrentSegment'; }
    | { what: 'invertAllSegments'; }
    | { what: 'fillSegmentsGaps'; }
    | { what: 'shiftAllSegmentTimes'; }
    | { what: 'alignSegmentTimesToKeyframes'; }
    | { what: 'selectSegmentsByExpr'; }
    | { what: 'mutateSegmentsByExpr'; }
    | { what: 'clearSegments'; }
    | { what: 'toggleCommandPalette'; }
    | { what: 'toggleSimpleMode'; }
    | { what: 'concatBatch'; }
    | { what: 'setStartTimeOffset'; }
    | { what: 'detectBlackScenes'; }
    | { what: 'detectSilentScenes'; }
    | { what: 'detectSceneChanges'; }
    | { what: 'readAllKeyframes'; }
    | { what: 'createSegmentsFromKeyframes'; }
    | { what: 'toggleLastCommands'; }
    | { what: 'toggleKeyboardShortcuts'; }
    | { what: 'openSendReportDialog'; };
