import { useAtomValue } from "jotai";
import { MotionConfig } from "motion/react";

import { prefersReducedMotionAtom } from "@/editor/0-core/9-state/user-settings";
import { Dialog_GenericHost } from "@/components/4-dialogs/7-0-dialogs/2-generic-dialog-host";
import { batchFilesAtom } from "@/editor/2-file/9-state/a-file-atoms";
import { showRightBarAtom } from "./a-layout-atoms";
import { MainArea_Toolbar } from "./3-main-area-toolbar";
import { Bar_Playback } from "@/editor/4-timeline/0-ui/bar-playback/0-bar-playback";
import { PlayerView, FileHosts } from "@/editor/3-player";
import { Timeline, TimelineHosts } from "@/editor/4-timeline";
import { Panel_Segments } from "@/editor/5-segments/0-ui/0-panel-segments";
import { ExportHosts } from "@/editor/7-export/0-ui/0-export-hosts";
import { BatchFilesList, ConcatHosts } from "@/editor/8-concat";
import { KeyboardHosts } from "@/editor/c-keyboard/0-ui/0-keyboard-hosts";
import { SettingsHosts } from "@/editor/d-settings/0-ui/0-settings-hosts";

/** LosslessCut-like editor layout. Regions are owned by feature folders, see src/editor/README.md */
export function EditorRoot() {
    const reducedMotion = useAtomValue(prefersReducedMotionAtom);
    return (
        <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>
            <div className="h-full min-h-0 select-none overflow-hidden flex flex-col">
                <MainArea_Toolbar />

                <div className="flex-1 min-h-0 flex">
                    <BatchFilesList_Guard />
                    <div className="flex-1 relative min-w-0 flex flex-col">
                        <PlayerView />
                    </div>
                    <Panel_Segments_Guard />
                </div>

                <Bar_Playback />
                <Timeline />
            </div>

            <FileHosts />
            <TimelineHosts />
            <ExportHosts />
            <ConcatHosts />
            <KeyboardHosts />
            <SettingsHosts />
            <Dialog_GenericHost />
        </MotionConfig>
    );
}

function BatchFilesList_Guard() {
    const batchFiles = useAtomValue(batchFilesAtom);
    if (batchFiles.length === 0) return null;
    return <BatchFilesList />;
}

function Panel_Segments_Guard() {
    const showRightBar = useAtomValue(showRightBarAtom);
    if (!showRightBar) return null;
    return <Panel_Segments />;
}
