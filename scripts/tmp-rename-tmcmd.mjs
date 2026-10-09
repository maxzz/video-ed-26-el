import fs from "fs";
import path from "path";

const map = {
    tmcmd_toggleSettings: "tmcmd_file_toggleSettings",
    tmcmd_closeBatch: "tmcmd_file_closeBatch",
    tmcmd_userHtml5ifyCurrentFile: "tmcmd_file_userHtml5ifyCurrentFile",
    tmcmd_closeFileWithConfirm: "tmcmd_file_closeFileWithConfirm",
    tmcmd_tryFixInvalidDuration: "tmcmd_file_tryFixInvalidDuration",
    tmcmd_openDirDialog: "tmcmd_file_openDirDialog",
    tmcmd_openFilesDialog: "tmcmd_file_openFilesDialog",
    tmcmd_promptDownloadMediaUrlWrapper: "tmcmd_file_promptDownloadMediaUrlWrapper",
    tmcmd_tryDecimate: "tmcmd_file_tryDecimate",
    tmcmd_exportYouTube: "tmcmd_file_exportYouTube",
    tmcmd_importEdlFile: "tmcmd_file_importEdlFile",
    tmcmd_tryExportEdlFile: "tmcmd_file_tryExportEdlFile",
    tmcmd_runEditCommand: "tmcmd_edit_runEditCommand",
    tmcmd_extractAllStreams: "tmcmd_edit_extractAllStreams",
    tmcmd_redoSegments: "tmcmd_edit_redoSegments",
    tmcmd_undoSegments: "tmcmd_edit_undoSegments",
    tmcmd_showStreamsSelector: "tmcmd_edit_showStreamsSelector",
    tmcmd_mutateSegmentsByExpr: "tmcmd_segments_mutateSegmentsByExpr",
    tmcmd_selectSegmentsByExpr: "tmcmd_segments_selectSegmentsByExpr",
    tmcmd_shiftAllSegmentTimes: "tmcmd_segments_shiftAllSegmentTimes",
    tmcmd_alignSegmentTimesToKeyframes: "tmcmd_segments_alignSegmentTimesToKeyframes",
    tmcmd_clearSegments: "tmcmd_segments_clearSegments",
    tmcmd_combineOverlappingSegments: "tmcmd_segments_combineOverlappingSegments",
    tmcmd_combineSelectedSegments: "tmcmd_segments_combineSelectedSegments",
    tmcmd_createFixedByteSizedSegments: "tmcmd_segments_createFixedByteSizedSegments",
    tmcmd_createFixedDurationSegments: "tmcmd_segments_createFixedDurationSegments",
    tmcmd_createNumSegments: "tmcmd_segments_createNumSegments",
    tmcmd_createRandomSegments: "tmcmd_segments_createRandomSegments",
    tmcmd_fillSegmentsGaps: "tmcmd_segments_fillSegmentsGaps",
    tmcmd_invertAllSegments: "tmcmd_segments_invertAllSegments",
    tmcmd_reorderSegsByStartTime: "tmcmd_segments_reorderSegsByStartTime",
    tmcmd_shuffleSegments: "tmcmd_segments_shuffleSegments",
    tmcmd_splitCurrentSegment: "tmcmd_segments_splitCurrentSegment",
    tmcmd_toggleCommandPalette: "tmcmd_view_toggleCommandPalette",
    tmcmd_toggleLastCommands: "tmcmd_tools_toggleLastCommands",
    tmcmd_askStartTimeOffset: "tmcmd_tools_askStartTimeOffset",
    tmcmd_readAllKeyframes: "tmcmd_tools_readAllKeyframes",
    tmcmd_createSegmentsFromKeyframes: "tmcmd_tools_createSegmentsFromKeyframes",
    tmcmd_concatBatch: "tmcmd_tools_concatBatch",
    tmcmd_dialog_DetectBlackScenes: "tmcmd_tools_dialog_DetectBlackScenes",
    tmcmd_dialog_DetectSceneChanges: "tmcmd_tools_dialog_DetectSceneChanges",
    tmcmd_dialog_DetectSilentScenes: "tmcmd_tools_dialog_DetectSilentScenes",
    tmcmd_toggleKeyboardShortcuts: "tmcmd_help_toggleKeyboardShortcuts",
    tmcmd_openSendReportDialogWithState: "tmcmd_help_openSendReportDialogWithState",
};

const names = Object.keys(map).sort((a, b) => b.length - a.length);
const re = new RegExp(`\\b(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "g");

function walk(dir, files = []) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name === "node_modules" || ent.name === "dist") continue;
            walk(p, files);
        } else if (/\.(ts|tsx)$/.test(ent.name)) files.push(p);
    }
    return files;
}

let changed = 0;
for (const file of walk("src")) {
    const text = fs.readFileSync(file, "utf8");
    if (!text.includes("tmcmd_")) continue;
    const next = text.replace(re, (m) => map[m]);
    if (next !== text) {
        fs.writeFileSync(file, next);
        changed++;
        console.log(file);
    }
}
console.log("files", changed);
