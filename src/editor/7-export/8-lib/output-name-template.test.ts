import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { formatDuration } from '@/editor/0-core/2-lib/duration.ts';
import type { SegmentToExport } from '@/editor/0-core/2-lib/types.ts';
import { defaultCutFileTemplate, generateCutFileNames, generateCutMergedFileNames, generateMergedFileNames, maxFileNameLength } from './output-name-template.ts';

const outputDir = path.resolve('/videos');
const sourceFile = { path: path.join(outputDir, 'my video.mp4') };

function cutFileNames(segmentsToExport: SegmentToExport[], overrides: Partial<Parameters<typeof generateCutFileNames>[0]> = {}) {
    return generateCutFileNames({
        fileDuration: 100,
        segmentsToExport,
        template: defaultCutFileTemplate,
        formatTimecode: formatDuration,
        isCustomFormatSelected: false,
        fileFormat: 'mp4',
        sourceFile,
        outputDir,
        safeOutputFileName: true,
        maxLabelLength: 100,
        outputFileNameMinZeroPadding: 1,
        exportCount: 0,
        currentFileExportCount: 0,
        ...overrides,
    });
}

describe('generateCutFileNames', () => {
    it('uses the default template', async () => {
        const { fileNames, problems } = await cutFileNames([{ start: 1.5, end: 10, originalIndex: 0 }]);
        expect(problems.error).toBeUndefined();
        expect(fileNames).toEqual(['my video-00.00.01.500-00.00.10.000.mp4']);
    });

    it('adds a segment suffix when exporting multiple segments', async () => {
        const { fileNames } = await cutFileNames([
            { start: 0, end: 1, originalIndex: 0 },
            { start: 2, end: 3, originalIndex: 1, name: 'Intro/Outro' },
        ]);
        expect(fileNames).toEqual([
            'my video-00.00.00.000-00.00.01.000-seg1.mp4',
            'my video-00.00.02.000-00.00.03.000-Intro_Outro.mp4',
        ]);
    });

    it('exports the whole file when there are no segments', async () => {
        const { fileNames } = await cutFileNames([]);
        expect(fileNames).toEqual(['my video-00.00.00.000-00.01.40.000.mp4']);
    });

    it('supports segment number, label, tags and export count variables', async () => {
        const segments: SegmentToExport[] = [
            { start: 0, end: 1, originalIndex: 8, name: 'a', tags: { group: 'x' } },
            { start: 1, end: 2, originalIndex: 9, name: 'b', tags: { group: 'y' } },
        ];
        const template = '${SEG_NUM}-${SEG_NUM_INT}-${SELECTED_SEG_NUM}-${SEG_LABEL}-${SEG_TAGS.group}-${SEG_TAGS.GROUP}-${EXPORT_COUNT}-${FILE_EXPORT_COUNT}${EXT}';
        const { fileNames, problems } = await cutFileNames(segments, { template, outputFileNameMinZeroPadding: 3, exportCount: 4, currentFileExportCount: 1 });
        expect(problems.error).toBeUndefined();
        expect(fileNames).toEqual(['009-9-001-a-x-x-5-2.mp4', '010-10-002-b-y-y-5-2.mp4']);
    });

    it('changes the extension when a custom format is selected', async () => {
        const { fileNames } = await cutFileNames([{ start: 0, end: 1, originalIndex: 0 }], { isCustomFormatSelected: true, fileFormat: 'matroska' });
        expect(fileNames[0]).toMatch(/\.mkv$/);
    });

    it('falls back to the default template on duplicate file names', async () => {
        const { fileNames, originalFileNames, problems } = await cutFileNames([
            { start: 0, end: 1, originalIndex: 0 },
            { start: 2, end: 3, originalIndex: 1 },
        ], { template: 'out${EXT}' });
        expect(problems.error).toMatch(/duplicate/);
        expect(originalFileNames).toEqual(['out.mp4', 'out.mp4']);
        expect(fileNames).toHaveLength(2);
        expect(new Set(fileNames).size).toBe(2);
    });

    it('reports a template that resolves to the input path', async () => {
        const { problems } = await cutFileNames([{ start: 0, end: 1, originalIndex: 0 }], { template: '${FILENAME}${EXT}' });
        expect(problems.error).toMatch(/same as the input path/);
        expect(problems.sameAsInputFileNameWarning).toBe(true);
    });

    it('reports template syntax errors', async () => {
        const { problems } = await cutFileNames([{ start: 0, end: 1, originalIndex: 0 }], { template: '${UNKNOWN_VAR}' });
        expect(problems.error).toBeDefined();
    });

    it('truncates long file names', async () => {
        const { fileNames, originalFileNames } = await cutFileNames([{ start: 0, end: 1, originalIndex: 0 }], { template: 'x'.repeat(300) });
        // the full path may still be too long (and then falls back to the default template)
        expect((originalFileNames ?? fileNames)[0]).toHaveLength(maxFileNameLength);
    });
});

describe('generateCutMergedFileNames', () => {
    it('uses the default template', async () => {
        const { fileNames, problems } = await generateCutMergedFileNames({
            template: '${FILENAME}-cut-merged-${EPOCH_MS}${EXT}',            isCustomFormatSelected: false,
            fileFormat: 'mp4',
            sourceFile,
            outputDir,
            safeOutputFileName: true,
            maxLabelLength: 100,
            exportCount: 0,
            currentFileExportCount: 0,
            segLabels: ['a', 'b'],
            epochMs: 1234,
        });
        expect(problems.error).toBeUndefined();
        expect(fileNames).toEqual(['my video-cut-merged-1234.mp4']);
    });
});

describe('generateMergedFileNames', () => {
    it('exposes all source files', async () => {
        const { fileNames, problems } = await generateMergedFileNames({
            template: '${FILES.length}-${FILES[1].name}-merged${EXT}',            isCustomFormatSelected: false,
            fileFormat: 'mp4',
            sourceFiles: [sourceFile, { path: path.join(outputDir, 'second.mp4') }],
            outputDir,
            safeOutputFileName: false,
            maxLabelLength: 100,
            exportCount: 0,
            epochMs: 1,
        });
        expect(problems.error).toBeUndefined();
        expect(fileNames).toEqual(['2-second.mp4-merged.mp4']);
    });
});
