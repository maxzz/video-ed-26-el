import i18n from 'i18next';
import { Trans } from 'react-i18next';
import invariant from 'tiny-invariant';
import { changeEnabledStreamsExpressionHelpUrl } from '@shared/constants';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { withErrorHandling } from '@/editor/0-core/9-state/working.ts';
import { mainApi } from '@/editor/0-core/8-lib/main-api.ts';
import { showOpenDialog } from '@/editor/0-core/8-lib/app-dialogs.tsx';
import { readFileFfprobeMeta } from '@/editor/0-core/8-lib/ffmpeg/ffmpeg.ts';
import type { FileParams, ParamsByFile, StreamParams } from '@/editor/0-core/8-lib/types.ts';
import { openExpressionDialog } from '@/editor/0-core/0-ui/expression-dialog.tsx';
import { allFilesMetaAtom, externalFilesMetaAtom, filePathAtom, paramsByFileAtom } from '@/editor/2-file/9-state/file-atoms.ts';
import { streamsSelectorShownAtom } from '@/components/2-main/0-all/a-panels-atoms.ts';
import { applyEnabledStreamsFilter, enabledStreamsFilterAtom, filterEnabledStreams, setCopyStreamIdsForPath } from '../9-state/streams-store.ts';

// Port of the streams related parts of upstream App.tsx and useStreamsMeta

export function showStreamsSelector() {
    appStore.set(streamsSelectorShownAtom, true);
}

export async function addStreamSourceFile(path: string) {
    if (appStore.get(allFilesMetaAtom)[path]) return undefined; // Already added?
    const fileMeta = await readFileFfprobeMeta(path);
    appStore.set(externalFilesMetaAtom, (old) => ({ ...old, [path]: fileMeta }));
    setCopyStreamIdsForPath(path, () => Object.fromEntries(fileMeta.streams.map(({ index }) => [index, true])));
    return fileMeta;
}

function cloneFileParams(fileParams: FileParams): FileParams {
    return {
        ...fileParams,
        metadata: { ...fileParams.metadata },
        paramsByStream: new Map([...fileParams.paramsByStream.entries()].map(([streamId, params]) => [streamId, { ...params, metadata: { ...params.metadata } }])),
    };
}

/** `setter` mutates a copy of the stream params (immer-like, as upstream used produce()) */
export function updateStreamParams(fileId: string, streamId: number, setter: (params: StreamParams) => void) {
    appStore.set(paramsByFileAtom, (old) => {
        const draft: ParamsByFile = new Map(old);
        const fileParams = cloneFileParams(draft.get(fileId) ?? { metadata: {}, paramsByStream: new Map() });
        const params = fileParams.paramsByStream.get(streamId) ?? { metadata: {} };
        setter(params);
        fileParams.paramsByStream.set(streamId, params);
        draft.set(fileId, fileParams);
        return draft;
    });
}

export function updateFileParams(fileId: string, setter: (params: FileParams) => void) {
    appStore.set(paramsByFileAtom, (old) => {
        const draft: ParamsByFile = new Map(old);
        const fileParams = cloneFileParams(draft.get(fileId) ?? { metadata: {}, paramsByStream: new Map() });
        setter(fileParams);
        draft.set(fileId, fileParams);
        return draft;
    });
}

export function removeExternalFile(path: string) {
    appStore.set(externalFilesMetaAtom, (old) => {
        const { [path]: _removed, ...rest } = old;
        return rest;
    });
}

export async function showIncludeExternalStreamsDialog() {
    await withErrorHandling(async () => {
        const { canceled, filePaths } = await showOpenDialog({ properties: ['openFile'], title: i18n.t('Include more tracks from other file') });
        const [firstFilePath] = filePaths;
        if (canceled || firstFilePath == null) return;
        await addStreamSourceFile(firstFilePath);
    }, i18n.t('Failed to include track'));
}

export const toggleStripCurrentFilter = () => applyEnabledStreamsFilter();

/** Ignores children so it can be used as an empty <Trans> slot */
const ActionName = ({ name }: { name: string; }) => <b className="font-mono">{name}</b>;

export async function changeEnabledStreamsFilter() {
    invariant(appStore.get(filePathAtom) != null);

    const isEmpty = (v: string) => v.trim().length === 0;

    await openExpressionDialog({
        confirmButtonText: i18n.t('Apply filter'),
        onSubmit: async (value: string) => {
            try {
                if (isEmpty(value)) return undefined;
                const streams = await filterEnabledStreams(value);
                if (streams.length === 0) return { error: i18n.t('No tracks match this expression.') };

                appStore.set(enabledStreamsFilterAtom, value);

                await applyEnabledStreamsFilter(value);
                return undefined;
            } catch (err) {
                if (err instanceof Error) {
                    return { error: i18n.t('Expression failed: {{errorMessage}}', { errorMessage: err.message }) };
                }
                throw err;
            }
        },
        examples: [
            { name: i18n.t('Audio tracks'), code: "track.codec_type === 'audio'" },
            { name: i18n.t('Video tracks'), code: "track.codec_type === 'video'" },
            { name: i18n.t('English language tracks'), code: "track.tags?.language === 'eng'" },
            { name: i18n.t('Tracks with at least 720p video'), code: 'track.height >= 720' },
            { name: i18n.t('Tracks with H264 codec'), code: "track.codec_name === 'h264'" },
            { name: i18n.t('1st, 2nd and 3rd track'), code: 'track.index >= 0 && track.index <= 2' },
        ],
        title: i18n.t('Toggle tracks by expression'),
        description: (
            <>
                <Trans>Enter a JavaScript filter expression which will be evaluated for each track of the current file. Tracks for which the expression evaluates to &quot;true&quot; will be selected or deselected. You may also the <ActionName name="toggleStripCurrentFilter" /> keyboard action to run this filter.</Trans>{' '}
                <button type="button" className="text-primary hover:underline" onClick={() => mainApi.openExternal(changeEnabledStreamsExpressionHelpUrl)}>{i18n.t('View available syntax.')}</button>
            </>
        ),
        inputValue: appStore.get(enabledStreamsFilterAtom) ?? '',
    });
}
