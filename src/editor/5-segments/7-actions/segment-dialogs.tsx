import i18n from 'i18next';
import { Trans } from 'react-i18next';
import pMap from 'p-map';
import invariant from 'tiny-invariant';
import type { StateSegment } from '@/editor/0-core/8-lib/types.ts';
import { segmentTagsSchema } from '@/editor/0-core/8-lib/types.ts';
import { editSegmentByExpressionHelpUrl, selectSegmentByExpressionHelpUrl } from '@shared/constants.ts';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { fireDialog } from '@/editor/0-core/9-state/dialogs.ts';
import { parseTimecode, timecodePlaceholderAtom } from '@/editor/0-core/9-state/timecode.ts';
import { UserFacingError } from '@/editor/0-core/8-lib/errors.ts';
import { mainApi } from '@/editor/0-core/8-lib/main-api.ts';
import safeishEval from '@/editor/0-core/8-lib/eval/eval.ts';
import { openExpressionDialog } from '@/editor/0-core/0-ui/expression-dialog.tsx';
import { editingSegmentTagsAtom, editingSegmentTagsSegmentIndexAtom } from '@/components/2-main/0-all/a-panels-atoms.ts';
import { fileDurationAtom } from '@/editor/2-file/9-state/a-file-atoms.ts';
import { getSegmentTags } from '../8-lib/segments.ts';
import { getCutSegments } from '../9-state/segments-store.ts';
import { openShiftSegmentsDialog } from '../0-ui/shift-segments-dialog.tsx';
import { getCurrentSegIndexSafe, modifySelectedSegmentTimes, selectSegments, setCutSegments, updateSegAtIndex, updateSegOrder } from './segment-actions.ts';

// Segment dialogs from upstream useSegments/App/SegmentList: expressions, tags, reorder, shift

interface ScopeSegment {
    index: number;
    label: string;
    start: number;
    end?: number | undefined;
    duration: number;
    tags: Record<string, string>;
}

function getScopeSegment(seg: Pick<StateSegment, 'name' | 'start' | 'end' | 'tags'>, index: number): ScopeSegment {
    const { start, end, name, tags } = seg;
    // must clone tags because scope is mutable (editable by expression)
    return { index, label: name, start, end, duration: end != null ? end - start : 0, tags: { ...tags } };
}

function expressionError(err: unknown) {
    if (err instanceof Error) return { error: i18n.t('Expression failed: {{errorMessage}}', { errorMessage: err.message }) };
    throw err;
}

const linkButtonClasses = 'text-primary hover:underline';

export async function selectSegmentsByExpr() {
    const cutSegments = getCutSegments();

    const matchSegment = async (seg: StateSegment, index: number, expr: string) => (
        (await safeishEval(expr, { segment: getScopeSegment(seg, index) })) === true
    );

    const getSegmentsToSelect = async (expr: string) => (
        await pMap(cutSegments, async (seg, index) => ((await matchSegment(seg, index, expr)) ? [seg] : []), { concurrency: 5 })
    ).flat();

    async function onSubmit(value: string) {
        try {
            if (value.trim().length === 0) return { error: i18n.t('Please enter a JavaScript expression.') };
            const segmentsToSelect = await getSegmentsToSelect(value);
            if (segmentsToSelect.length === 0) return { error: i18n.t('No segments match this expression.') };
            if (segmentsToSelect.length === cutSegments.length) return { error: i18n.t('All segments match this expression.') };
            selectSegments(segmentsToSelect);
            return undefined;
        } catch (err) {
            return expressionError(err);
        }
    }

    await openExpressionDialog({
        onSubmit,
        confirmButtonText: i18n.t('Select segments'),
        examples: [
            { name: i18n.t('Segment duration less than 5 seconds'), code: 'segment.duration < 5' },
            { name: i18n.t('Segment starts after 01:00'), code: 'segment.start > 60' },
            { name: i18n.t('Segment label (exact)'), code: "segment.label === 'My label'" },
            { name: i18n.t('Segment label (starts with)'), code: "segment.label.startsWith('My lab')" },
            { name: i18n.t('Segment label (regexp)'), code: '/^My label/.test(segment.label)' },
            { name: i18n.t('Segment tag value'), code: "segment.tags.myTag === 'tag value'" },
            { name: i18n.t('Markers'), code: 'segment.end == null' },
        ],
        title: i18n.t('Select segments by expression'),
        description: <Trans>Enter a JavaScript expression which will be evaluated for each segment. Segments for which the expression evaluates to &quot;true&quot; will be selected. <button type="button" className={linkButtonClasses} onClick={() => mainApi.openExternal(selectSegmentByExpressionHelpUrl)}>View available syntax.</button></Trans>,
        variables: ['segment.index', 'segment.label', 'segment.start', 'segment.end', 'segment.duration', 'segment.tags.*'],
    });
}

export async function mutateSegmentsByExpr() {
    const cutSegments = getCutSegments();

    async function mutateSegment(seg: StateSegment, index: number, expr: string) {
        const response = await safeishEval(expr, { segment: getScopeSegment(seg, index) });
        invariant(typeof response === 'object' && response != null, i18n.t('The expression must return an object'));
        const ret: Partial<Pick<StateSegment, 'name' | 'start' | 'end' | 'tags'>> = {};
        if ('label' in response) {
            if (typeof response.label !== 'string') throw new UserFacingError(i18n.t('"{{property}}" must be a string', { property: 'label' }));
            ret.name = response.label;
        }
        if ('start' in response) {
            if (typeof response.start !== 'number') throw new UserFacingError(i18n.t('"{{property}}" must be a number', { property: 'start' }));
            ret.start = response.start;
        }
        if ('end' in response) {
            if (!(typeof response.end === 'number' || response.end === undefined)) throw new UserFacingError(i18n.t('"{{property}}" must be a number', { property: 'end' }));
            ret.end = response.end;
        }
        if ('tags' in response) {
            const tags = segmentTagsSchema.safeParse(response.tags);
            if (!tags.success) throw new UserFacingError(i18n.t('"{{property}}" must be an object of strings', { property: 'tags' }));
            ret.tags = tags.data;
        }
        return ret;
    }

    async function onSubmit(value: string) {
        try {
            if (value.trim().length === 0) return { error: i18n.t('Please enter a JavaScript expression.') };
            const mutated = await pMap(cutSegments, async (seg, index) => ({
                ...seg,
                ...(seg.selected && await mutateSegment(seg, index, value)),
            }), { concurrency: 5 });
            setCutSegments(mutated, appStore.get(fileDurationAtom));
            return undefined;
        } catch (err) {
            return expressionError(err);
        }
    }

    await openExpressionDialog({
        onSubmit,
        confirmButtonText: i18n.t('Apply change'),
        examples: [
            { name: i18n.t('Expand segments +5 sec'), code: '{ start: segment.start - 5, end: segment.end + 5 }' },
            { name: i18n.t('Shrink segments -5 sec'), code: '{ start: segment.start + 5, end: segment.end - 5 }' },
            { name: i18n.t('Center segments around start time'), code: '{ start: segment.start - 5, end: segment.start + 5 }' },
            // eslint-disable-next-line no-template-curly-in-string
            { name: i18n.t('Add number suffix to label'), code: '{ label: `${segment.label} ${segment.index + 1}` }' },
            { name: i18n.t('Add a tag to every even segment'), code: '{ tags: (segment.index + 1) % 2 === 0 ? { ...segment.tags, even: \'true\' } : segment.tags }' },
            { name: i18n.t('Convert segments to markers'), code: '{ end: undefined }' },
            { name: i18n.t('Convert markers to segments'), code: '{ ...(segment.end == null && { end: segment.start + 5 }) }' },
        ],
        title: i18n.t('Edit segments by expression'),
        description: <Trans>Enter a JavaScript expression which will be evaluated for each selected segment. Returned properties will be edited. <button type="button" className={linkButtonClasses} onClick={() => mainApi.openExternal(editSegmentByExpressionHelpUrl)}>View available syntax.</button></Trans>,
        variables: ['segment.index', 'segment.label', 'segment.start', 'segment.end', 'segment.tags.*'],
    });
}

// Segment tags (the dialog is rendered by TimelineHosts)

export function editSegmentTags(index: number) {
    const seg = getCutSegments()[index];
    if (seg == null) return;
    appStore.set(editingSegmentTagsSegmentIndexAtom, index);
    appStore.set(editingSegmentTagsAtom, getSegmentTags(seg));
}

export const editCurrentSegmentTags = () => editSegmentTags(getCurrentSegIndexSafe());

export function closeSegmentTagsEditor() {
    appStore.set(editingSegmentTagsSegmentIndexAtom, undefined);
    appStore.set(editingSegmentTagsAtom, undefined);
}

export function saveSegmentTags() {
    const index = appStore.get(editingSegmentTagsSegmentIndexAtom);
    invariant(index != null);
    updateSegAtIndex(index, { tags: appStore.get(editingSegmentTagsAtom) });
    closeSegmentTagsEditor();
}

// Reorder

export async function reorderSegmentDialog(index: number) {
    const numSegments = getCutSegments().length;
    if (numSegments < 2) return;
    const { value } = await fireDialog({
        title: `${i18n.t('Change order of segment')} ${index + 1}`,
        text: i18n.t('Please enter a number from 1 to {{n}} to be the new order for the current segment', { n: numSegments }),
        input: 'text',
        inputValue: String(index + 1),
        showCancelButton: true,
        inputValidator: (v) => {
            const parsed = parseInt(v, 10);
            return Number.isNaN(parsed) || parsed > numSegments || parsed < 1 ? i18n.t('Invalid number entered') : undefined;
        },
    });
    if (value) updateSegOrder(index, parseInt(value, 10) - 1);
}

// Shift

export async function shiftAllSegmentTimes() {
    const shift = await openShiftSegmentsDialog({ inputPlaceholder: appStore.get(timecodePlaceholderAtom), parseTimecode });
    if (shift == null) return;
    const { startShift, endShift } = shift;
    await modifySelectedSegmentTimes((segment) => {
        const newSegment = { ...segment };
        if (startShift != null) newSegment.start += startShift;
        if (endShift != null && newSegment.end != null) newSegment.end += endShift;
        return newSegment;
    });
}
