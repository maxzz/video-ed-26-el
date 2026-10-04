import '../../features.ts';
import { useAtomValue } from 'jotai';
import { MotionConfig } from 'motion/react';
import { prefersReducedMotionAtom } from '@/editor/0-core/9-state/user-settings.ts';
import { DialogHost } from '@/editor/0-core/0-ui/dialog-host.tsx';
import { batchFilesAtom } from '@/editor/2-file/9-state/file-atoms.ts';
import { showRightBarAtom } from '../9-state/layout-atoms.ts';
import { TopMenu } from './top-menu.tsx';
import { BottomBar } from './bottom-bar.tsx';
import { PlayerView, FileHosts } from '@/editor/3-player/index.ts';
import { Timeline, TimelineHosts } from '@/editor/4-timeline/index.ts';
import { SegmentList } from '@/editor/5-segments/index.ts';
import { ExportHosts } from '@/editor/7-export/index.ts';
import { BatchFilesList, ConcatHosts } from '@/editor/8-concat/index.ts';
import { KeyboardHosts } from '@/editor/c-keyboard/index.ts';
import { SettingsHosts } from '@/editor/d-settings/index.ts';

/** LosslessCut-like editor layout. Regions are owned by feature folders, see src/editor/README.md */
export function EditorRoot() {
    const reducedMotion = useAtomValue(prefersReducedMotionAtom);
    return (
        <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>
            <div className="select-none h-full min-h-0 overflow-hidden flex flex-col">
                <TopMenu />

                <div className="min-h-0 flex-1 flex">
                    <BatchArea />
                    <div className="relative min-w-0 flex-1 flex flex-col">
                        <PlayerView />
                    </div>
                    <RightBar />
                </div>

                <Timeline />
                <BottomBar />
            </div>

            <FileHosts />
            <TimelineHosts />
            <ExportHosts />
            <ConcatHosts />
            <KeyboardHosts />
            <SettingsHosts />
            <DialogHost />
        </MotionConfig>
    );
}

function BatchArea() {
    const batchFiles = useAtomValue(batchFilesAtom);
    if (batchFiles.length === 0) return null;
    return <BatchFilesList />;
}

function RightBar() {
    const showRightBar = useAtomValue(showRightBarAtom);
    if (!showRightBar) return null;
    return <SegmentList />;
}
