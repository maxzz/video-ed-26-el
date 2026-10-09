import i18n from "i18next";
import { type EdlExportType, type EdlFileType, type EdlImportType, type StateSegment } from "@/editor/0-core/8-lib/9-types-core";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { customOutDirAtom } from "@/editor/0-core/9-state/user-settings";
import { getFrameCount } from "@/editor/0-core/9-state/timecode";
import { withErrorHandling } from "@/editor/0-core/9-state/working";
import { openDialog_YouTubeChaptersDialog } from "@/components/4-dialogs/7-1-dialogs/00-app-dialogs";
import { detectedFpsAtom, fileDurationAtom, filePathAtom } from "@/editor/2-file/9-state/a-file-atoms";
import { checkFileOpened } from "@/editor/3-player/7-actions/player-actions";
import { cutSegmentsAtom, selectedSegmentsAtom } from "@/editor/5-segments/9-state/a-segments-store";
import { loadCutSegments } from "@/editor/5-segments/7-actions/segment-actions";
import { askForEdlImport, exportEdlFile, readEdlFile } from "../8-lib/edl-store";
import { formatYouTube } from "../8-lib/edl-formats";

export async function loadEdlFile({ path, type, append = false }: { path: string; type: EdlFileType; append?: boolean; }) {
    console.log('Loading EDL file', type, path, append);
    // cannot clampDuration because the duration is undefined (if no file loaded) or duration of a different file (if switching files)
    loadCutSegments({ segments: await readEdlFile({ type, path, fps: jotaiDefaultStore.get(detectedFpsAtom) }), append });
}

/** Native menu: File > Import project > <type> */
export async function tmcmd_file_importEdlFile(type: EdlImportType) {
    if (!checkFileOpened()) return;

    await withErrorHandling(async () => {
        const fileDuration = jotaiDefaultStore.get(fileDurationAtom);
        const edl = await askForEdlImport({ type, fps: jotaiDefaultStore.get(detectedFpsAtom), fileDuration });
        if (edl.length > 0) loadCutSegments({ segments: edl, append: true, clampDuration: fileDuration });
    }, i18n.t('Failed to import project file'));
}

export async function tmcmd_file_exportYouTube() {
    if (!checkFileOpened()) return;
    await openDialog_YouTubeChaptersDialog(formatYouTube(jotaiDefaultStore.get(cutSegmentsAtom) as StateSegment[]));
}

/** Native menu: File > Export project > <type>. Exports the selected segments */
export async function tmcmd_file_tryExportEdlFile(type: EdlExportType | 'youtube') {
    if (type === 'youtube') {
        await tmcmd_file_exportYouTube();
        return;
    }
    const selectedSegments = jotaiDefaultStore.get(selectedSegmentsAtom);
    if (!checkFileOpened() || selectedSegments.length === 0) return;
    await withErrorHandling(async () => {
        await exportEdlFile({
            type,
            cutSegments: selectedSegments as StateSegment[],
            customOutDir: jotaiDefaultStore.get(customOutDirAtom),
            filePath: jotaiDefaultStore.get(filePathAtom),
            getFrameCount,
        });
    }, i18n.t('Failed to export project'));
}
