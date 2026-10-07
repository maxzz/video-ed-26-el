import { observe } from "jotai-effect";
import pMap from "p-map";
import invariant from "tiny-invariant";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { getDefaultOutFormat, mapRecommendedDefaultFormat, readFileFfprobeMeta } from "@/editor/0-core/8-lib/ffmpeg/ffmpeg";
import { isAbortedError, readFileStats } from "@/editor/0-core/8-lib/util";
import { batchFilePathsAtom, detectedFileFormatAtom, fileFormatAtom } from "@/editor/2-file/9-state/a-file-atoms";
import { defaultMergedFileTemplate } from "@/editor/7-export/8-lib/output-name-template";
import {
    type ConcatFileMeta, concatEnableReadFileMetaAtom, concatFilesMetaAtom, concatFirstPathAtom, concatGeneratedFileNamesAtom,
    concatMergedFileTemplateAtom, concatTempMergedFileTemplateAtom, concatUniqueSuffixAtom, generateConcatFileNames,
    isConcatDialogShownAtom, outFormatLockedAtom, simpleModeAtom,
} from "../9-state/concat-atoms";

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
            const existingMeta = jotaiDefaultStore.get(concatFilesMetaAtom);

            const newMetaEntries = await pMap(pathsToFetchMetaFrom, async (path) => {
                abortController.signal.throwIfAborted();
                return [path, existingMeta[path] ?? await readConcatFileMeta(path)] as const;
            }, { concurrency: 1 });

            const firstFileMeta = newMetaEntries[0]?.[1];
            invariant(firstFileMeta);
            const fileFormatNew = await getDefaultOutFormat({ filePath: firstPath, fileMeta: firstFileMeta.ffprobeMeta });

            abortController.signal.throwIfAborted();

            jotaiDefaultStore.set(detectedFileFormatAtom, fileFormatNew);
            jotaiDefaultStore.set(fileFormatAtom, outFormatLocked || mapRecommendedDefaultFormat({ sourceFormat: fileFormatNew, streams: firstFileMeta.ffprobeMeta.streams }).format);
            jotaiDefaultStore.set(concatFilesMetaAtom, (existing) => ({ ...existing, ...Object.fromEntries(newMetaEntries) }));
            jotaiDefaultStore.set(concatUniqueSuffixAtom, Date.now());
        })().catch((err: unknown) => {
            if (isAbortedError(err)) return;
            console.error(err);
        });

        return () => abortController.abort();
    }, jotaiDefaultStore);

    /** In simple mode, use a name generated from the first file as the template, so users don't *have to* deal with variables */
    observe((get) => {
        if (!get(isConcatDialogShownAtom) || !get(simpleModeAtom) || get(concatFirstPathAtom) == null || get(fileFormatAtom) == null) return undefined;
        let canceled = false;
        generateConcatFileNames(get, defaultMergedFileTemplate).then((generated) => {
            const [fileName] = generated?.fileNames ?? [];
            if (!canceled && fileName != null) jotaiDefaultStore.set(concatTempMergedFileTemplateAtom, fileName);
        }).catch(console.error);
        return () => { canceled = true; };
    }, jotaiDefaultStore);

    /** Output file name preview of the template editor */
    observe((get) => {
        if (!get(isConcatDialogShownAtom)) return undefined;
        let canceled = false;
        generateConcatFileNames(get, get(concatMergedFileTemplateAtom)).then((generated) => {
            if (!canceled) jotaiDefaultStore.set(concatGeneratedFileNamesAtom, generated);
        }).catch(console.error);
        return () => { canceled = true; };
    }, jotaiDefaultStore);
}
