import { handleError } from "@/editor/0-core/9-state/working";
import * as edit from "./edit";
import * as file from "./file";
import * as help from "./help";
import * as host from "./host";
import * as segments from "./segments";
import * as tools from "./tools";
import { type MenuAction } from "./type-menu-action";
import * as view from "./view";

export { type MenuAction } from "./type-menu-action";

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
