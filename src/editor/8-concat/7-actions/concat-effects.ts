import { observe } from 'jotai-effect';
import pMap from 'p-map';
import invariant from 'tiny-invariant';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { getDefaultOutFormat, mapRecommendedDefaultFormat, readFileFfprobeMeta } from '@/editor/0-core/8-lib/ffmpeg/ffmpeg.ts';
import { isAbortedError, readFileStats } from '@/editor/0-core/8-lib/util.ts';
import { batchFilePathsAtom, detectedFileFormatAtom, fileFormatAtom } from '@/editor/2-file/9-state/a-file-atoms.ts';
import { defaultMergedFileTemplate } from '@/editor/7-export/8-lib/output-name-template.ts';
import {
    type ConcatFileMeta, concatEnableReadFileMetaAtom, concatFilesMetaAtom, concatFirstPathAtom, concatGeneratedFileNamesAtom,
    concatMergedFileTemplateAtom, concatTempMergedFileTemplateAtom, concatUniqueSuffixAtom, generateConcatFileNames,
    isConcatDialogShownAtom, outFormatLockedAtom, simpleModeAtom,
} from '../9-state/concat-atoms.ts';

// Reactions of the merge dialog (upstream ConcatDialog useEffects)

async function readConcatFileMeta(path: string): Promise<ConcatFileMeta> {
    const stats = await readFileStats(path);
    return {
        ffprobeMeta: await readFileFfprobeMeta(path),
        stats: { size: stats.size, atime: stats.atimeMs, mtime: stats.mtimeMs, ctime: stats.ctime.getTime(), birthtime: stats.birthtime.getTime() },
    };
}

export function initConcatEffects() {
    /** Reads the meta of the files to merge (or only the first one when the compatibility check is off) and picks the output format */
    observe((get, set) => {
        if (!get(isConcatDialogShownAtom)) {
            set(concatFilesMetaAtom, {});
            set(concatTempMergedFileTemplateAtom, defaultMergedFileTemplate);
            return undefined;
        }

        const paths = get(batchFilePathsAtom);
        const firstPath = paths[0];
        invariant(firstPath != null);
        const enableReadFileMeta = get(concatEnableReadFileMetaAtom);
        const outFormatLocked = get(outFormatLockedAtom);
        const abortController = new AbortController();

        (async () => {
            const pathsToFetchMetaFrom = enableReadFileMeta ? paths : [firstPath];
            const existingMeta = appStore.get(concatFilesMetaAtom);

            const newMetaEntries = await pMap(pathsToFetchMetaFrom, async (path) => {
                abortController.signal.throwIfAborted();
                return [path, existingMeta[path] ?? await readConcatFileMeta(path)] as const;
            }, { concurrency: 1 });

            const firstFileMeta = newMetaEntries[0]?.[1];
            invariant(firstFileMeta);
            const fileFormatNew = await getDefaultOutFormat({ filePath: firstPath, fileMeta: firstFileMeta.ffprobeMeta });

            abortController.signal.throwIfAborted();

            appStore.set(detectedFileFormatAtom, fileFormatNew);
            appStore.set(fileFormatAtom, outFormatLocked || mapRecommendedDefaultFormat({ sourceFormat: fileFormatNew, streams: firstFileMeta.ffprobeMeta.streams }).format);
            appStore.set(concatFilesMetaAtom, (existing) => ({ ...existing, ...Object.fromEntries(newMetaEntries) }));
            appStore.set(concatUniqueSuffixAtom, Date.now());
        })().catch((err: unknown) => {
            if (isAbortedError(err)) return;
            console.error(err);
        });

        return () => abortController.abort();
    }, appStore);

    /** In simple mode, use a name generated from the first file as the template, so users don't *have to* deal with variables */
    observe((get) => {
        if (!get(isConcatDialogShownAtom) || !get(simpleModeAtom) || get(concatFirstPathAtom) == null || get(fileFormatAtom) == null) return undefined;
        let canceled = false;
        generateConcatFileNames(get, defaultMergedFileTemplate).then((generated) => {
            const [fileName] = generated?.fileNames ?? [];
            if (!canceled && fileName != null) appStore.set(concatTempMergedFileTemplateAtom, fileName);
        }).catch(console.error);
        return () => { canceled = true; };
    }, appStore);

    /** Output file name preview of the template editor */
    observe((get) => {
        if (!get(isConcatDialogShownAtom)) return undefined;
        let canceled = false;
        generateConcatFileNames(get, get(concatMergedFileTemplateAtom)).then((generated) => {
            if (!canceled) appStore.set(concatGeneratedFileNamesAtom, generated);
        }).catch(console.error);
        return () => { canceled = true; };
    }, appStore);
}
