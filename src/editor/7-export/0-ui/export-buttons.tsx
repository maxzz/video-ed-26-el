import type { ComponentProps } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import { FileOutputIcon, NotebookPenIcon, ScissorsIcon } from 'lucide-react';
import { effectiveExportModeAtom, userSettingsAtom } from '@/editor/0-core/0-state/user-settings.ts';
import type { ExportMode } from '@/editor/0-core/2-lib/types.ts';
import { toggleExportConfirmEnabled } from '@/editor/4-timeline/1-actions/timeline-actions.ts';
import { segmentsOrInverseAtom, segmentsToExportAtom } from '@/editor/5-segments/0-state/segments-store.ts';
import { Button } from '@/ui/shadcn/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/shadcn/select';
import { cn } from '@/utils/classnames';
import { areWeCuttingAtom } from '../0-state/export-atoms.ts';
import { onExportPress, setExportMode } from '../1-actions/export-actions.ts';

export function ExportButton({ className, onClick = onExportPress, ...rest }: Omit<ComponentProps<typeof Button>, 'onClick'> & { onClick?: () => void; }) {
    const { t } = useTranslation();
    const segmentsToExport = useAtomValue(segmentsToExportAtom);
    const areWeCutting = useAtomValue(areWeCuttingAtom);
    const { autoMerge, simpleMode } = useAtomValue(userSettingsAtom);

    const CutIcon = areWeCutting ? ScissorsIcon : FileOutputIcon;

    let title = t('Export');
    if (segmentsToExport.length === 1) {
        title = t('Export selection');
    } else if (segmentsToExport.length > 1) {
        title = t('Export {{ num }} segments', { num: segmentsToExport.length });
    }

    const text = autoMerge && segmentsToExport.length > 1 ? t('Export+merge') : t('Export');

    return (
        <Button
            title={title}
            className={cn(simpleMode && 'animate-pulse', className)}
            onClick={(e) => { e.currentTarget.blur(); onClick(); }}
            {...rest}
        >
            <CutIcon />
            {text}
        </Button>
    );
}

export function ToggleExportConfirm({ className }: { className?: string; }) {
    const { t } = useTranslation();
    const { exportConfirmEnabled } = useAtomValue(userSettingsAtom);
    return (
        <Button variant="ghost" size="icon-sm" className={cn(exportConfirmEnabled ? 'text-primary' : 'text-muted-foreground', className)} title={t('Show export options screen before exporting?')} onClick={toggleExportConfirmEnabled}>
            <NotebookPenIcon />
        </Button>
    );
}

export function ExportModeButton({ className }: { className?: string; }) {
    const { t } = useTranslation();
    const effectiveExportMode = useAtomValue(effectiveExportModeAtom);
    const selectedSegments = useAtomValue(segmentsOrInverseAtom).selected;

    const selectableModes: ExportMode[] = [
        'separate',
        ...(selectedSegments.length >= 2 || effectiveExportMode === 'merge' ? ['merge'] as const : []),
        ...(selectedSegments.length >= 2 || effectiveExportMode === 'merge+separate' ? ['merge+separate'] as const : []),
        'segments_to_chapters',
    ];

    const titles: Record<ExportMode, string> = {
        segments_to_chapters: t('Segments to chapters'),
        merge: t('Merge cuts'),
        'merge+separate': t('Merge & Separate'),
        separate: t('Separate files'),
    };

    return (
        <Select value={effectiveExportMode} onValueChange={(v) => setExportMode(v as ExportMode)}>
            <SelectTrigger size="sm" className={cn('min-w-0', className)} title={t('Export mode')}>
                <SelectValue placeholder={t('Export mode')} />
            </SelectTrigger>
            <SelectContent position="popper">
                {selectableModes.map((mode) => <SelectItem key={mode} value={mode}>{titles[mode]}</SelectItem>)}
            </SelectContent>
        </Select>
    );
}
