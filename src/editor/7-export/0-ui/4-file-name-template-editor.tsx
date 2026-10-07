import { useEffect, useRef } from "react";
import { proxy, useSnapshot } from "valtio";
import { useAtomValue } from "jotai";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { Switch } from "@/ui/shadcn/switch";
import { Label } from "@/ui/shadcn/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/ui/shadcn/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { AnimatePresence, motion } from "motion/react";
import { ChevronUpIcon, CircleHelpIcon, EyeIcon, FileIcon, PencilIcon, TriangleAlertIcon, Undo2Icon } from "lucide-react";
import debounce from "lodash/debounce";
import { useTranslation } from "react-i18next";

import { mainApi } from "@/editor/0-core/7-actions/0-main-api";
import { userSettings, userSettingsAtom } from "@/editor/0-core/9-state/user-settings";

import { HighlightedText } from "./7-controls";
import { exportedFileNameTemplateHelpUrl } from "@shared/constants";
import { type GeneratedOutFileNames, type GenerateOutFileNames, extVariable, segNumIntVariable, segNumVariable, segSuffixVariable, segTagsVariable, selectedSegNumIntVariable, selectedSegNumVariable } from "../8-lib/output-name-template";
import { toggleSafeOutputFileName } from "../7-actions/export-actions";

export type FileNameTemplateEditorMode = 'separate' | 'merge-segments' | 'merge-files';

export function FileNameTemplateEditor(opts: {
    template: string;
    setTemplate: (text: string) => void;
    defaultTemplate: string;
    generateFileNames: GenerateOutFileNames;
    currentSegIndexSafe?: number;
    mode: FileNameTemplateEditorMode;
}) {
    const { template, setTemplate, defaultTemplate, generateFileNames, mode, currentSegIndexSafe } = opts;
    const { safeOutputFileName, outputFileNameMinZeroPadding, simpleMode } = useAtomValue(userSettingsAtom);
    const { t } = useTranslation();

    const state = editorStates[mode];
    const snap = useSnapshot(state, { sync: true });
    const inputRef = useRef<HTMLInputElement>(null);

    const isSimpleMergeFilesMode = simpleMode && mode === 'merge-files';

    useEffect(
        () => {
            const abortController = new AbortController();
            generateFileNames(template)
                .then((newGenerated) => {
                    if (abortController.signal.aborted) {
                        return;
                    }
                    state.generated = newGenerated;
                    // if an important message appears, make sure we don't auto-close after it's resolved https://github.com/mifi/lossless-cut/issues/2567
                    if (newGenerated.problems.error != null || newGenerated.problems.sameAsInputFileNameWarning) {
                        state.open = true;
                    }
                })
                .catch(console.error);
            return () => abortController.abort();
        },
        [generateFileNames, state, template]);

    const generated = snap.generated as GeneratedOutFileNames | undefined;
    const text = snap.text ?? template;
    const open = snap.open || isSimpleMergeFilesMode;

    const hasTextNumericPaddedValue = [segNumVariable, selectedSegNumVariable, segSuffixVariable].some((v) => template.includes(formatVariable(v)));
    const isMissingExtension = !template.endsWith(extVariableFormatted);

    const availableVariables = (
        () => {
            const common = ['FILENAME', extVariable, 'EPOCH_MS', 'SEG_LABEL', 'EXPORT_COUNT'];
            if (mode === 'merge-segments') {
                return [...common, 'FILE_EXPORT_COUNT'];
            }
            if (mode === 'separate') {
                return [
                    ...common,
                    'CUT_FROM',
                    ...(!simpleMode ? ['CUT_FROM_NUM'] : []),
                    'CUT_TO',
                    ...(!simpleMode ? ['CUT_TO_NUM'] : []),
                    'CUT_DURATION',
                    segNumVariable,
                    ...(!simpleMode ? [segNumIntVariable] : []),
                    selectedSegNumVariable,
                    ...(!simpleMode ? [selectedSegNumIntVariable] : []),
                    segSuffixVariable, segTagsExample,
                ];
            }
            return common;
        }
    )();

    function setText(value: string) {
        state.text = value;
        commits[mode](state, setTemplate);
    }

    function reset() {
        commits[mode].cancel();
        state.text = undefined;
        setTemplate(defaultTemplate);
    }

    function onVariableClick(variable: string) {
        const input = inputRef.current;
        const startPos = input?.selectionStart;
        const endPos = input?.selectionEnd;
        if (startPos == null || endPos == null) {
            return;
        }
        const toInsert = variable === segTagsExample ? `${segTagsExample} ?? ''` : variable;
        setText(`${text.slice(0, startPos)}${formatVariable(toInsert)}${text.slice(endPos)}`);
    }

    function formatCurrentSegFileOrFirst(names: readonly string[]) {
        if (mode === 'separate' && currentSegIndexSafe != null) {
            const fileName = names[currentSegIndexSafe];
            if (fileName != null) {
                return fileName;
            }
        }
        return names[0];
    }

    return (
        <div className="flex flex-col gap-1">
            {generated != null && (
                <div>
                    {mode === 'separate' ? t('Output name(s):', { count: generated.fileNames.length }) : t('Merged output file name:')}
                </div>
            )}

            {generated != null && (
                <HighlightedText title={open ? t('Close') : t('Edit')} className="break-all" onClick={() => { state.open = !state.open; }}>
                    {generated.problems.error != null && <TriangleAlertIcon className="mr-1 size-3.5 inline text-destructive" />}

                    {generated.originalFileNames != null && formatCurrentSegFileOrFirst(generated.fileNames)}

                    <span className={generated.originalFileNames != null ? 'ml-1 text-destructive line-through' : undefined}>
                        {formatCurrentSegFileOrFirst(generated.originalFileNames ?? generated.fileNames)}
                    </span>
                    {open ? <ChevronUpIcon className="ml-1 size-3.5 inline" /> : <PencilIcon className="ml-1 size-3 inline" />}
                </HighlightedText>
            )}

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        className="overflow-hidden"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        key="editor"
                    >
                        <div className="my-2 px-3 py-2 border rounded-md flex flex-col gap-2">
                            {!isSimpleMergeFilesMode && (
                                <div className="text-xs text-muted-foreground">{t('Output file name template')}:</div>
                            )}

                            <div className="flex items-center gap-2">
                                <Input ref={inputRef} className="h-8 text-xs font-mono" value={text} autoFocus autoComplete="off" autoCapitalize="off" autoCorrect="off" onChange={(e) => setText(e.target.value)} />

                                {generated != null && generated.fileNames.length > 1 && (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="icon-sm" title={t('Preview')}>
                                                <EyeIcon />
                                            </Button>
                                        </DialogTrigger>

                                        <DialogContent className="sm:max-w-2xl">
                                            <DialogHeader>
                                                <DialogTitle>
                                                    {t('Resulting segment file names', { count: generated.fileNames.length })}
                                                </DialogTitle>
                                                <DialogDescription className="sr-only">
                                                    {t('Preview')}
                                                </DialogDescription>
                                            </DialogHeader>

                                            <div className="max-h-100 text-sm overflow-y-auto flex flex-col gap-2">
                                                {generated.fileNames.map(
                                                    (f) => (
                                                        <div key={f} className="break-all flex items-center gap-2">
                                                            <FileIcon className="shrink-0 size-3.5" />
                                                            {f}
                                                        </div>
                                                    )
                                                )
                                                }
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )}

                                {!isSimpleMergeFilesMode && (
                                    <Button variant="outline" size="sm" onClick={reset}><Undo2Icon className="text-destructive" />
                                        {t('Reset')}
                                    </Button>
                                )}
                            </div>

                            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
                                {`${t('Variables')}:`}

                                <button type="button" className="text-foreground cursor-pointer" onClick={() => mainApi.openExternal(exportedFileNameTemplateHelpUrl)}>
                                    <CircleHelpIcon className="size-4" />
                                </button>

                                {availableVariables.map(
                                    (variable) => (
                                        <button key={variable} type="button" className="underline decoration-dashed cursor-copy" onClick={() => onVariableClick(variable)}>
                                            {variable}
                                        </button>
                                    )
                                )}
                            </div>

                            {hasTextNumericPaddedValue && (
                                <div className="text-xs flex items-center gap-2">
                                    <Select value={String(outputFileNameMinZeroPadding)} onValueChange={(v) => { userSettings.outputFileNameMinZeroPadding = parseInt(v, 10); }}>
                                        <SelectTrigger size="sm" className="w-16">
                                            <SelectValue />
                                        </SelectTrigger>

                                        <SelectContent position="popper">
                                            {Array.from({ length: 10 }, (_v, i) => i + 1).map(
                                                (v) => <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>

                                    {t('Minimum numeric padded length')}
                                </div>
                            )}

                            {!simpleMode && (
                                <Label className="text-xs font-normal flex items-center gap-2" title={t('Whether or not to sanitize output file names (sanitizing removes special characters)')}>
                                    <Switch size="sm" checked={safeOutputFileName} onCheckedChange={toggleSafeOutputFileName} />

                                    {t('Sanitize file names')}

                                    {!safeOutputFileName && <TriangleAlertIcon className="size-3.5 text-amber-500" />}
                                </Label>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {generated?.problems.error != null
                ? (
                    <TemplateWarning danger>{generated.problems.error}</TemplateWarning>
                ) : (
                    generated != null && (<>
                        {generated.problems.sameAsInputFileNameWarning && (
                            <TemplateWarning>
                                {t('Output file name is the same as the source file name. This increases the risk of accidentally overwriting or deleting source files!')}
                            </TemplateWarning>
                        )}

                        {/* In simple mode for merge-files, we auto generate file name, so there might be no ${EXT} variable */}
                        {!isSimpleMergeFilesMode && isMissingExtension && (
                            <TemplateWarning>
                                {t('The file name template is missing {{ext}} and will result in a file without the suggested extension. This may result in an unplayable output file.', { ext: extVariableFormatted })}
                            </TemplateWarning>
                        )}
                    </>)
                )
            }
        </div>
    );
}

function TemplateWarning({ danger, children }: { danger?: boolean; children: string; }) {
    return (
        <div className="mb-2 text-xs flex items-start gap-1.5">
            <TriangleAlertIcon className={danger ? 'shrink-0 mt-0.5 size-3.5 text-destructive' : 'shrink-0 mt-0.5 size-3.5 text-amber-500'} />
            {children}
        </div>
    );
}

//---------------------------------------------------------------------------

function formatVariable(variable: string) {
    return `\${${variable}}`;
}

const extVariableFormatted = formatVariable(extVariable);
const segTagsExample = `${segTagsVariable}.XX`;

interface EditorState {
    /** Text being edited, undefined when equal to the committed template */
    text: string | undefined;
    open: boolean;
    generated: GeneratedOutFileNames | undefined;
}

// At most one editor per mode is visible at a time
const editorStates: Record<FileNameTemplateEditorMode, EditorState> = {
    'separate': proxy<EditorState>({
        text: undefined,
        open: false,
        generated: undefined
    }),
    'merge-segments': proxy<EditorState>({
        text: undefined,
        open: false,
        generated: undefined
    }),
    'merge-files': proxy<EditorState>({
        text: undefined,
        open: false,
        generated: undefined
    }),
};

const createCommit = () => debounce(
    (state: EditorState, setTemplate: (text: string) => void) => {
        if (state.text == null) {
            return;
        }
        setTemplate(state.text);
        state.text = undefined;
    },
    500);

const commits: Record<FileNameTemplateEditorMode, ReturnType<typeof createCommit>> = {
    'separate': createCommit(),
    'merge-segments': createCommit(),
    'merge-files': createCommit(),
};
