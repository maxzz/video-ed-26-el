import type { ComponentProps, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileIcon, XIcon } from 'lucide-react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/ui/shadcn/context-menu';
import { cn } from '@/utils/classnames';
import { batchListRemoveFile, onBatchFileSelect } from '@/editor/2-file/index.ts';

const sortableTransition = { duration: 150, easing: 'ease-in-out' };

interface BatchFileProps {
    path: string;
    name: string;
    index: number;
    isOpen?: boolean;
    isSelected?: boolean;
}

/** Port of upstream components/BatchFile.tsx */
export function Menu_BatchFile(props: BatchFileProps) {
    const { t } = useTranslation();
    const { path } = props;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: path, transition: sortableTransition });

    function handleClick(e: MouseEvent<HTMLDivElement>) {
        onBatchFileSelect(path);
        e.currentTarget.blur();
    }

    function handleDeleteClick(e: MouseEvent<HTMLButtonElement>) {
        e.stopPropagation();
        batchListRemoveFile(path);
        e.currentTarget.blur();
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <BatchFileRow
                    {...props}
                    {...attributes}
                    {...listeners}
                    ref={setNodeRef}
                    style={{ transform: CSS.Transform.toString(transform), transition }}
                    className={cn('cursor-default', isDragging && 'invisible')}
                    onClick={handleClick}
                >
                    <button type="button" className="shrink-0 -mr-1 p-1 text-destructive hover:bg-destructive/10 rounded-sm cursor-pointer" title={t('Remove')} onClick={handleDeleteClick}>
                        <XIcon className="size-3" />
                    </button>
                </BatchFileRow>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onSelect={() => batchListRemoveFile(path)}>{t('Remove')}</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

/** Copy of the row that follows the pointer while dragging */
export function BatchFileDragOverlay(props: BatchFileProps) {
    return <BatchFileRow {...props} className="bg-background opacity-60 shadow-md cursor-grabbing" />;
}

function BatchFileRow({ path, name, index, isOpen, isSelected, className, children, ...rest }: BatchFileProps & ComponentProps<'div'>) {
    return (
        <div
            role="button"
            tabIndex={-1}
            title={path}
            className={cn(
                'py-0.5 pr-0.5 pl-1.5 h-6 text-[13px] border-r-4 flex items-center gap-1',
                isSelected && 'bg-muted',
                isOpen ? 'border-primary' : 'border-transparent',
                className,
            )}
            {...rest}
        >
            <FileIcon className={cn('shrink-0 size-3.5', isSelected && 'text-primary')} />
            <div className="shrink-0">{index + 1}.</div>
            <div className="whitespace-nowrap [direction:rtl] overflow-hidden">
                <span className="inline-block [direction:ltr] [unicode-bidi:isolate]">{name}</span>
            </div>
            <div className="grow" />
            {children}
        </div>
    );
}
