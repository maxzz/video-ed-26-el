import { type MenuAction } from "./9-types-menu-action";
import { handleError } from "@/editor/0-core/9-state/working";

import * as file from "./1-top-menu-file";
import * as edit from "./2-top-menu-edit";
import * as segments from "./3-top-menu-segments";
import * as view from "./4-top-menu-view";
import * as tools from "./5-top-menu-tools";
import * as help from "./6-top-menu-help";
import * as host from "./7-top-menu-host";

export { type MenuAction } from "./9-types-menu-action";

/** Every application-menu command. Callers use only this function. */
export function runMenuAction(action: MenuAction) {
    void run(action);
}

async function run(action: MenuAction) {
    try {
        await dispatch(action);
    } catch (err) {
        handleError({ err });
    }
}

function dispatch(action: MenuAction) {
    switch (action.what) {
        case 'openFilesDialog': return file.openFilesDialog();
        case 'openDirDialog': return file.openDirDialog();
        case 'promptDownloadMediaUrl': return file.promptDownloadMediaUrl();
        case 'closeCurrentFile': return file.closeCurrentFile();
        case 'closeBatch': return file.closeBatch();
        case 'importEdlFile': return file.importEdlFile(action.format);
        case 'exportEdlFile': return file.exportEdlFile(action.format);
        case 'exportYouTube': return file.exportYouTube();
        case 'html5ify': return file.html5ify();
        case 'fixInvalidDuration': return file.fixInvalidDuration();
        case 'decimate': return file.decimate();
        case 'toggleSettings': return file.toggleSettings();
        case 'undo': return edit.undo();
        case 'redo': return edit.redo();
        case 'edit': return edit.edit(action.command);
        case 'extractAllStreams': return edit.extractAllStreams();
        case 'showStreamsSelector': return edit.showStreamsSelector();
        case 'createNumSegments': return segments.createNumSegments();
        case 'createFixedDurationSegments': return segments.createFixedDurationSegments();
        case 'createFixedByteSizedSegments': return segments.createFixedByteSizedSegments();
        case 'createRandomSegments': return segments.createRandomSegments();
        case 'reorderSegsByStartTime': return segments.reorderSegsByStartTime();
        case 'shuffleSegments': return segments.shuffleSegments();
        case 'combineOverlappingSegments': return segments.combineOverlappingSegments();
        case 'combineSelectedSegments': return segments.combineSelectedSegments();
        case 'splitCurrentSegment': return segments.splitCurrentSegment();
        case 'invertAllSegments': return segments.invertAllSegments();
        case 'fillSegmentsGaps': return segments.fillSegmentsGaps();
        case 'shiftAllSegmentTimes': return segments.shiftAllSegmentTimes();
        case 'alignSegmentTimesToKeyframes': return segments.alignSegmentTimesToKeyframes();
        case 'selectSegmentsByExpr': return segments.selectSegmentsByExpr();
        case 'mutateSegmentsByExpr': return segments.mutateSegmentsByExpr();
        case 'clearSegments': return segments.clearSegments();
        case 'toggleCommandPalette': return view.toggleCommandPalette();
        case 'toggleSimpleMode': return view.toggleSimpleMode();
        case 'concatBatch': return tools.concatBatch();
        case 'setStartTimeOffset': return tools.setStartTimeOffset();
        case 'detectBlackScenes': return tools.detectBlackScenes();
        case 'detectSilentScenes': return tools.detectSilentScenes();
        case 'detectSceneChanges': return tools.detectSceneChanges();
        case 'readAllKeyframes': return tools.readAllKeyframes();
        case 'createSegmentsFromKeyframes': return tools.createSegmentsFromKeyframes();
        case 'toggleLastCommands': return tools.toggleLastCommands();
        case 'toggleKeyboardShortcuts': return help.toggleKeyboardShortcuts();
        case 'openSendReportDialog': return help.openSendReportDialog();
        case 'quit': return host.quit();
        case 'minimize': return host.minimize();
        case 'toggleMaximize': return host.toggleMaximize();
        case 'toggleFullscreen': return host.toggleFullscreen();
        case 'toggleDevTools': return host.toggleDevTools();
        case 'showAbout': return host.showAbout();
        case 'zoom': return host.zoom(action.direction);
        case 'openExternal': return host.openExternal(action.url);
        case 'showItemInFolder': return host.showItemInFolder(action.path);
        case 'openPath': return host.openPath(action.path);
        default: {
            const unreachable: never = action;
            return unreachable;
        }
    }
}
