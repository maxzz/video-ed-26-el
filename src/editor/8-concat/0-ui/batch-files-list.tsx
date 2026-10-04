import type { DragEvent } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { ArrowDownAZIcon, ArrowUpAZIcon, CombineIcon, WandSparklesIcon, XIcon } from 'lucide-react';
import { closestCenter, DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Button } from '@/ui/shadcn/button';
import { batchFilesAtom, filePathAtom, selectedBatchFilesAtom } from '@/editor/2-file/9-state/file-atoms.ts';
import { closeBatch, convertFormatBatch, handleBatchFilesDrop } from '@/editor/2-file/index.ts';
import { batchDraggingIdAtom, batchSortDescAtom } from '../9-state/concat-atoms.ts';
import { onBatchDragCancel, onBatchDragEnd, onBatchDragStart, sortBatchFiles } from '../7-actions/batch-list-actions.ts';
import { concatBatch } from '../7-actions/concat-actions.ts';
import { BatchFile, BatchFileDragOverlay } from './batch-file.tsx';

const mySpring = { type: 'spring' as const, damping: 50, stiffness: 700 };

function onDrop(e: DragEvent<HTMLDivElement>) {
    // don't let the drop reach the global file drop handler, the files go into the batch
    e.stopPropagation();
    handleBatchFilesDrop(e);
}

/** Port of upstream components/BatchFilesList.tsx (left panel) */
export function BatchFilesList() {
    const { t } = useTranslation();
    const batchFiles = useAtomValue(batchFilesAtom);
    const sortDesc = useAtomValue(batchSortDescAtom);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }));

    const SortIcon = sortDesc ? ArrowDownAZIcon : ArrowUpAZIcon;

    return (
        <motion.div
            className="shrink-0 select-none w-60 min-w-40 max-w-[50vw] bg-muted/40 border-r overflow-hidden flex flex-col resize-x"
            initial={{ x: -240 }}
            animate={{ x: 0 }}
            exit={{ x: -240 }}
            transition={mySpring}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
        >
            <div className="pl-2 pr-1 py-1 flex flex-wrap items-center justify-end gap-0.5">
                <div className="text-xs">{t('Batch file list')}{batchFiles.length > 0 && ` (${batchFiles.length})`}</div>
                <div className="grow" />
                <Button variant="ghost" size="icon-xs" title={`${t('Convert to supported format')}...`} onClick={() => convertFormatBatch()}>
                    <WandSparklesIcon />
                </Button>
                <Button variant="ghost" size="icon-xs" title={t('Sort items')} onClick={sortBatchFiles}>
                    <SortIcon />
                </Button>
                <Button size="icon-xs" title={`${t('Merge/concatenate files')}...`} onClick={concatBatch}>
                    <CombineIcon />
                </Button>
                <Button variant="ghost" size="icon-xs" className="text-muted-foreground" title={t('Close batch')} onClick={() => closeBatch()}>
                    <XIcon />
                </Button>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragStart={onBatchDragStart} onDragEnd={onBatchDragEnd} onDragCancel={onBatchDragCancel}>
                <SortableContext items={batchFiles.map((f) => f.path)} strategy={verticalListSortingStrategy}>
                    <BatchFilesItems />
                </SortableContext>

                <DragOverlay>
                    <DraggingBatchFile />
                </DragOverlay>
            </DndContext>
        </motion.div>
    );
}

function BatchFilesItems() {
    const batchFiles = useAtomValue(batchFilesAtom);
    const selectedBatchFiles = useAtomValue(selectedBatchFilesAtom);
    const filePath = useAtomValue(filePathAtom);
    return (
        <div className="overflow-x-hidden overflow-y-auto">
            {batchFiles.map(({ path, name }, index) => (
                <BatchFile key={path} index={index} path={path} name={name} isSelected={selectedBatchFiles.includes(path)} isOpen={filePath === path} />
            ))}
        </div>
    );
}

function DraggingBatchFile() {
    const draggingId = useAtomValue(batchDraggingIdAtom);
    const batchFiles = useAtomValue(batchFilesAtom);
    const index = batchFiles.findIndex((f) => f.path === draggingId);
    const file = batchFiles[index];
    if (file == null) return null;
    return <BatchFileDragOverlay index={index} path={file.path} name={file.name} />;
}
