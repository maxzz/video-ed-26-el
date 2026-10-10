import { useState } from "react";
import { useAtomValue } from "jotai";
import { MotionConfig } from "motion/react";
import { type Layout, type LayoutChangedMeta } from "react-resizable-panels";

import { prefersReducedMotionAtom } from "@/editor/0-core/9-state/user-settings";
import { Dialog_GenericHost } from "@/components/4-dialogs/7-0-dialogs/2-generic-dialog-host";
import { batchFilesAtom } from "@/editor/2-file/9-state/a-file-atoms";
import { appSettings } from "@/store/1-ui-settings";
import { mainPanelId, segmentsPanelId } from "@/store/2-panel-sizes";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/ui/shadcn/resizable";
import { showRightBarAtom } from "./a-layout-atoms";
import { Bar_Playback } from "@/editor/4-timeline/0-ui/bar-playback/0-bar-playback";
import { PlayerView, FileHosts } from "@/editor/3-player";
import { Timeline, TimelineHosts } from "@/editor/4-timeline";
import { Panel_Segments } from "@/editor/5-segments/0-ui/0-panel-segments";
import { ExportHosts } from "@/editor/7-export/0-ui/0-export-hosts";
import { BatchFilesList, ConcatHosts } from "@/editor/8-concat";
import { KeyboardHosts } from "@/editor/c-keyboard/0-ui/0-keyboard-hosts";
import { SettingsHosts } from "@/editor/d-settings/0-ui/0-settings-hosts";

/** The inner panel wrapper scrolls by default; the editor columns manage their own overflow. */
const panelStyle = { overflow: "hidden" } as const;

/** LosslessCut-like editor layout. Regions are owned by feature folders, see src/editor/README.md */
export function EditorRoot() {
    const reducedMotion = useAtomValue(prefersReducedMotionAtom);
    return (
        <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>
            <div className="select-none h-full min-h-0 overflow-hidden">
                <EditorColumns />
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

function EditorColumns() {
    const showRightBar = useAtomValue(showRightBarAtom);
    if (!showRightBar) {
        return <LeftColumn />;
    }
    return <SplitColumns />;
}

function SplitColumns() {
    // Read once: the group applies defaultLayout on mount, including each time the sidebar is opened again.
    const [defaultLayout] = useState(() => ({ ...appSettings.panelSizes.horizontal }));

    return (
        <ResizablePanelGroup orientation="horizontal" defaultLayout={defaultLayout} onLayoutChanged={onMainSplitChanged}>
            <ResizablePanel id={mainPanelId} minSize={320} className="min-h-0" style={panelStyle}>
                <LeftColumn />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel id={segmentsPanelId} defaultSize={280} minSize={200} maxSize="45%" className="min-h-0" style={panelStyle}>
                <Panel_Segments />
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}

function onMainSplitChanged(_layout: Layout, meta: LayoutChangedMeta) {
    if (!meta.isUserInteraction || meta.requestedLayout == null) {
        return;
    }

    const main = meta.requestedLayout[mainPanelId];
    const segments = meta.requestedLayout[segmentsPanelId];
    if (typeof main !== "number" || typeof segments !== "number") {
        return;
    }

    appSettings.panelSizes.horizontal = {
        [mainPanelId]: main,
        [segmentsPanelId]: segments,
    };
}

function LeftColumn() {
    return (
        <div className="h-full min-h-0 overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex">
                <BatchFilesList_Guard />
                <div className="relative flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
                    <PlayerView />
                </div>
            </div>

            <Bar_Playback />
            <Timeline />
        </div>
    );
}

function BatchFilesList_Guard() {
    const batchFiles = useAtomValue(batchFilesAtom);
    if (batchFiles.length === 0) return null;
    return <BatchFilesList />;
}
