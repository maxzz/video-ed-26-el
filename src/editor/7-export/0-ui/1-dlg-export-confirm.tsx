import { type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { motion } from "motion/react";
import { cn } from "@/utils/classnames";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { Switch } from "@/ui/shadcn/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/ui/shadcn/sheet";
import { CircleCheckIcon, InfoIcon, SettingsIcon, TriangleAlertIcon } from "lucide-react";
import i18n from "i18next";
import { Trans, useTranslation } from "react-i18next";

import { mainApi } from "@/editor/0-core/7-actions/0-main-api";
import { type AvoidNegativeTs, type PreserveMetadata } from "@shared/types";
import { troubleshootingUrl } from "@shared/constants";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { effectiveExportModeAtom, userSettings, userSettingsAtom } from "@/editor/0-core/9-state/user-settings";
import { findNearestKeyFrameTime } from "@/editor/0-core/8-lib/ffmpeg/ffmpeg";
import { isMov as ffmpegIsMov } from "@/editor/0-core/8-lib/ffmpeg/streams";
import { closeExportConfirm, exportConfirmOpenAtom, settingsVisibleAtom, streamsSelectorShownAtom } from "@/components/2-main/0-all/a-panels-atoms";
import { encBitrateAtom, fileFormatAtom, numStreamsTotalAtom, outputDirAtom } from "@/editor/2-file/9-state/a-file-atoms";
import { outputPlaybackRateAtom } from "@/editor/3-player/9-state/a-player-atoms";
import { neighbouringKeyFramesAtom } from "@/editor/4-timeline/9-state/timeline-atoms";
import { toggleExportConfirmEnabled } from "@/editor/4-timeline/7-actions/3-timeline-actions";
import { currentSegIndexSafeAtom, segmentsOrInverseAtom, segmentsToExportAtom } from "@/editor/5-segments/9-state/segments-store";
import { mainCopiedThumbnailStreamsAtom, numStreamsToCopyAtom } from "@/editor/6-streams/9-state/a-streams-store";
import {
    areWeCuttingAtom, cutFileTemplateOrDefaultAtom, cutMergedFileTemplateOrDefaultAtom, effectiveExportShowAdvancedAtom, exportShowAdvancedAtom, getLossyMode, isEncodingAtom, needSmartCutAtom,
    setCutFileTemplate, setCutMergedFileTemplate, setEncBitrate, willMergeAtom,
} from "../9-state/export-atoms";
import { onExportConfirm, toggleKeyframeCut } from "../7-actions/export-actions";
import { generateCutMergedOutFileNamesFnAtom, generateOutSegFileNamesFnAtom } from "../7-actions/out-file-names";
import { defaultCutFileTemplate, defaultCutMergedFileTemplate } from "../8-lib/output-name-template";
import { HelpIcon, HighlightedText, showHelpText } from "./controls";
import { ExportButton, ExportModeButton, ToggleExportConfirm } from "./export-buttons";
import { FileNameTemplateEditor } from "./file-name-template-editor";
import { CurrentFileOutputFormatSelect } from "./output-format-select";
import { OutDirSelector } from "./out-dir-selector";

// Port of upstream components/ExportConfirm.tsx

export function Dialog_ExportConfirm() {
    const visible = useAtomValue(exportConfirmOpenAtom);
    return (
        <Sheet open={visible} onOpenChange={(open) => !open && closeExportConfirm()}>
            <SheetContent side="right" className="w-full sm:max-w-3xl gap-0">
                {visible && <ExportConfirmContent />}
            </SheetContent>
        </Sheet>
    );
}

function ExportConfirmContent() {
    const settings = useAtomValue(userSettingsAtom);
    const {
        keyframeCut, preserveMovData, preserveMetadata, preserveChapters, movFastStart, avoidNegativeTs, autoDeleteMergedSegments, exportConfirmEnabled, segmentsToChapters,
        preserveMetadataOnMerge, enableSmartCut, enableOverwriteOutput, ffmpegExperimental, cutFromAdjustmentFrames, cutToAdjustmentFrames, simpleMode, keyframesEnabled,
    } = settings;
    const { t } = useTranslation();

    const effectiveExportMode = useAtomValue(effectiveExportModeAtom);
    const areWeCutting = useAtomValue(areWeCuttingAtom);
    const segmentsToExport = useAtomValue(segmentsToExportAtom);
    const segmentsOrInverse = useAtomValue(segmentsOrInverseAtom);
    const willMerge = useAtomValue(willMergeAtom);
    const outFormat = useAtomValue(fileFormatAtom);
    const outputDir = useAtomValue(outputDirAtom);
    const numStreamsTotal = useAtomValue(numStreamsTotalAtom);
    const numStreamsToCopy = useAtomValue(numStreamsToCopyAtom);
    const cutFileTemplate = useAtomValue(cutFileTemplateOrDefaultAtom);
    const cutMergedFileTemplate = useAtomValue(cutMergedFileTemplateOrDefaultAtom);
    const generateCutFileNames = useAtomValue(generateOutSegFileNamesFnAtom);
    const generateCutMergedFileNames = useAtomValue(generateCutMergedOutFileNamesFnAtom);
    const currentSegIndexSafe = useAtomValue(currentSegIndexSafeAtom);
    const mainCopiedThumbnailStreams = useAtomValue(mainCopiedThumbnailStreamsAtom);
    const needSmartCut = useAtomValue(needSmartCutAtom);
    const isEncoding = useAtomValue(isEncodingAtom);
    const encBitrate = useAtomValue(encBitrateAtom);
    const outputPlaybackRate = useAtomValue(outputPlaybackRateAtom);
    const neighbouringKeyFrames = useAtomValue(neighbouringKeyFramesAtom);
    const showAdvanced = useAtomValue(effectiveExportShowAdvancedAtom);
    const lossyMode = getLossyMode();

    const isMov = ffmpegIsMov(outFormat);
    const isIpod = outFormat === 'ipod';

    // some thumbnail streams (png,jpg etc) cannot always be cut correctly, so we warn if they try to.
    const areWeCuttingProblematicStreams = areWeCutting && mainCopiedThumbnailStreams.length > 0;

    const haveSegmentWithProblematicKeyframe = neighbouringKeyFrames.length > 0 && segmentsToExport.some(({ start, end }) => {
        const nearestPreviousKeyframeTime = findNearestKeyFrameTime({ frames: neighbouringKeyFrames, time: start, direction: -1 }) ?? 0;
        const segmentDuration = end - start;
        const estimatedExportedSegmentDuration = end - nearestPreviousKeyframeTime;
        // if estimated actual output length of segment is more than 1.5 times the intended segment duration, then we consider it problematic
        return estimatedExportedSegmentDuration > segmentDuration * 1.5;
    });

    const specific: Record<'exportMode' | 'problematicStreams' | 'movFastStart' | 'preserveMovData' | 'smartCut' | 'cutMode' | 'avoidNegativeTs' | 'overwriteOutput', Notice | undefined> = {
        exportMode: effectiveExportMode === 'segments_to_chapters' ? { text: t('Segments to chapters mode is active, this means that the file will not be cut. Instead chapters will be created from the segments.') } : undefined,
        problematicStreams: areWeCuttingProblematicStreams ? { warning: true, text: <Trans>Warning: Cutting thumbnail tracks is known to cause problems. Consider disabling track {{ trackNumber: mainCopiedThumbnailStreams[0] ? mainCopiedThumbnailStreams[0].index + 1 : 0 }}.</Trans> } : undefined,
        movFastStart: isMov && isIpod && !movFastStart ? { warning: true, text: t('For the ipod format, it is recommended to activate this option') } : undefined,
        preserveMovData: isMov && isIpod && preserveMovData ? { warning: true, text: t('For the ipod format, it is recommended to deactivate this option') } : undefined,
        smartCut: areWeCutting && needSmartCut ? { warning: true, text: t('Smart cut is experimental and will not work on all files.') } : undefined,
        cutMode: areWeCutting && !isEncoding && !keyframeCut ? { text: t('Note: Keyframe cut is recommended for most common files') } : undefined,
        avoidNegativeTs: !isEncoding ? (
            () => {
                if (willMerge) {
                    if (avoidNegativeTs !== 'make_non_negative') {
                        return { text: t('When merging, it\'s generally recommended to set this to "make_non_negative"') };
                    }
                    return undefined;
                }
                if (!['make_zero', 'auto'].includes(avoidNegativeTs)) {
                    return { text: t('It\'s generally recommended to set this to one of: {{values}}', { values: '"auto", "make_zero"' }) };
                }
                return undefined;
            }
        )() : undefined,
        overwriteOutput: enableOverwriteOutput ? { text: t('Existing files will be overwritten without warning!') } : undefined,
    };

    const generic: GenericNotice[] = [];
    if (simpleMode) generic.push({ text: t('You are in simple mode, meaning some functionality has been simplified or hidden.') });
    if (effectiveExportMode !== 'segments_to_chapters' && !areWeCutting) generic.push({ text: t('Exporting whole file without cutting, because there are no segments to export.') });
    if (areWeCutting) {
        // https://github.com/mifi/lossless-cut/issues/1809
        if (outFormat === 'flac') generic.push({ text: t('There is a known issue in FFmpeg with cutting FLAC files. The file will be re-encoded, which is still lossless, but the export may be slower.') });
        if (outputPlaybackRate !== 1) generic.push({ warning: true, text: t('Adjusting the output FPS and cutting at the same time will cause incorrect cuts. Consider instead doing it in two separate steps.') });
        if (keyframesEnabled && haveSegmentWithProblematicKeyframe) {
            generic.push({ warning: true, text: t('A segment may result in an unexpectedly long output file length after exporting, because your video file doesn\'t have any keyframes near the start time of the segment you\'re trying to cut.'), url: troubleshootingUrl });
        }
    }
    const totalNumWarnings = generic.filter((n) => n.warning).length + Object.values(specific).filter((n) => n?.warning).length;

    const exportModeDescription = {
        segments_to_chapters: t('Don\'t cut the file, but instead export an unmodified original which has chapters generated from segments'),
        merge: t('Auto merge segments to one file after export'),
        'merge+separate': t('Auto merge segments into one file after export, but keep exported per-segment files too'),
        separate: t('Export each segment to a separate file'),
    }[effectiveExportMode];

    function onAvoidNegativeTsHelpPress() {
        // https://ffmpeg.org/ffmpeg-all.html#Format-Options
        // https://github.com/mifi/lossless-cut/issues/1206
        const texts = {
            make_non_negative: i18n.t('Shift timestamps to make them non-negative. Also note that this affects only leading negative timestamps, and not non-monotonic negative timestamps.'),
            make_zero: i18n.t('Shift timestamps so that the first timestamp is 0. (LosslessCut default)'),
            auto: i18n.t('Enables shifting when required by the target format.'),
            disabled: i18n.t('Disables shifting of timestamp.'),
        };
        showHelpText({ text: `${avoidNegativeTs}: ${texts[avoidNegativeTs]}` });
    }

    const canEditSegTemplate = !willMerge || !autoDeleteMergedSegments;

    function handleEncBitrateChange(value: string) {
        const v = parseInt(value, 10);
        if (Number.isNaN(v) || v <= 0) return;
        setEncBitrate(v);
    }

    return (<>
        <SheetHeader className="border-b">
            <SheetTitle>{t('Export options')}</SheetTitle>
            <SheetDescription className="sr-only">{t('Export options')}</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-4 min-h-0 text-sm overflow-y-auto flex-1">
            {generic.map((notice) => (
                <div key={notice.text} className="py-2 border-b border-border/50 flex items-center gap-2">
                    <div className="flex-1"><NoticeText notice={notice} /></div>
                    {notice.url != null && <HelpIcon title={t('Learn more')} onClick={() => mainApi.openExternal(notice.url!)} />}
                </div>
            ))}

            {segmentsOrInverse.selected.length !== segmentsOrInverse.all.length && (
                <div className="py-2 flex items-center gap-1.5">
                    <CircleCheckIcon className="size-3.5" />
                    {t('{{selectedSegments}} of {{nonFilteredSegments}} segments selected', { selectedSegments: segmentsOrInverse.selected.length, nonFilteredSegments: segmentsOrInverse.all.length })}
                </div>
            )}

            <Row
                label={segmentsOrInverse.selected.length > 1 ? t('Export mode for {{segments}} segments', { segments: segmentsOrInverse.selected.length }) : t('Export mode')}
                notice={specific.exportMode}
                help={() => showHelpText({ text: exportModeDescription })}
            >
                <ExportModeButton className="w-44" />
            </Row>

            <Row
                label={t('Output container format:')}
                help={() => showHelpText({ text: i18n.t('Defaults to same format as input file. You can losslessly change the file format (container) of the file with this option. Not all formats support all codecs. Matroska/MP4/MOV support the most common codecs. Sometimes it\'s even impossible to export to the same output format as input.') })}
            >
                <CurrentFileOutputFormatSelect className="w-44" />
            </Row>

            <Row
                label={<Trans>Input has {{ numStreamsTotal }} tracks</Trans>}
                notice={specific.problematicStreams}
                help={() => showHelpText({ text: i18n.t('Not all formats support all track types, and LosslessCut is unable to properly cut some track types, so you may have to sacrifice some tracks by disabling them in order to get correct result.') })}
            >
                <HighlightedText onClick={() => jotaiDefaultStore.set(streamsSelectorShownAtom, true)}><Trans>Keeping {{ numStreamsToCopy }} tracks</Trans></HighlightedText>
            </Row>

            <Row label={t('Save output to path:')}>
                <OutDirSelector>
                    <HighlightedText className="max-w-80 break-all">{outputDir}</HighlightedText>
                </OutDirSelector>
            </Row>

            {canEditSegTemplate && (
                <div className="py-2 border-b border-border/50 grid grid-cols-[1fr_auto] items-start gap-3">
                    <FileNameTemplateEditor mode="separate" template={cutFileTemplate} setTemplate={setCutFileTemplate} defaultTemplate={defaultCutFileTemplate} generateFileNames={generateCutFileNames} currentSegIndexSafe={currentSegIndexSafe} />
                    <div className="w-5 flex justify-center"><HelpIcon onClick={() => showHelpText({ text: i18n.t('You can customize the file name of the output segment(s) using special variables.', { count: segmentsToExport.length }) })} /></div>
                </div>
            )}

            {willMerge && (
                <div className="py-2 border-b border-border/50 grid grid-cols-[1fr_auto] items-start gap-3">
                    <FileNameTemplateEditor mode="merge-segments" template={cutMergedFileTemplate} setTemplate={setCutMergedFileTemplate} defaultTemplate={defaultCutMergedFileTemplate} generateFileNames={generateCutMergedFileNames} />
                    <div className="w-5 flex justify-center"><HelpIcon onClick={() => showHelpText({ text: i18n.t('You can customize the file name of the merged file using special variables.') })} /></div>
                </div>
            )}

            <Row
                label={t('Overwrite existing files')}
                notice={specific.overwriteOutput}
                help={() => showHelpText({ text: t('Overwrite files when exporting, if a file with the same name as the output file name exists?') })}
            >
                <Switch checked={enableOverwriteOutput} onCheckedChange={(v) => { userSettings.enableOverwriteOutput = v; }} />
            </Row>

            <h3 className="mt-6 mb-1 text-base font-semibold">{t('Advanced options')}</h3>
            <div className="py-1 text-xs text-muted-foreground">{t('Depending on your specific file/player, you may have to try different options for best results.')}</div>

            <Row label={t('Show advanced options')}>
                <Switch checked={showAdvanced} onCheckedChange={(v) => jotaiDefaultStore.set(exportShowAdvancedAtom, v)} />
            </Row>

            {showAdvanced && (
                <>
                    {areWeCutting && (
                        <>
                            <Row animated label={t('Shift all start times')} help={() => showHelpText({ text: i18n.t('This option allows you to shift all segment start times forward by one or more frames before cutting. This can be useful if the output video starts from the wrong (preceding) keyframe.') })}>
                                <ShiftTimes values={adjustCutFromValues} num={cutFromAdjustmentFrames} setNum={(n) => { userSettings.cutFromAdjustmentFrames = n; }} />
                            </Row>
                            <Row animated label={t('Shift all end times')}>
                                <ShiftTimes values={adjustCutToValues} num={cutToAdjustmentFrames} setNum={(n) => { userSettings.cutToAdjustmentFrames = n; }} />
                            </Row>
                        </>
                    )}

                    {isMov && (
                        <>
                            <Row animated label={t('Enable MOV Faststart?')} notice={specific.movFastStart} help={() => showHelpText({ text: i18n.t('Enabling this will allow faster playback of the exported file. This makes processing use 3 times as much export I/O, which is negligible for small files but might slow down exporting of large files.') })}>
                                <Switch checked={movFastStart} onCheckedChange={(v) => { userSettings.movFastStart = v; }} />
                            </Row>
                            <Row animated label={t('Preserve all MP4/MOV metadata?')} notice={specific.preserveMovData} help={() => showHelpText({ text: i18n.t('Preserve all MOV/MP4 metadata tags (e.g. EXIF, GPS position etc.) from source file? Note that some players have trouble playing back files where all metadata is preserved, like iTunes and other Apple software') })}>
                                <Switch checked={preserveMovData} onCheckedChange={(v) => { userSettings.preserveMovData = v; }} />
                            </Row>
                        </>
                    )}

                    <Row animated label={t('Preserve chapters')} help={() => showHelpText({ text: i18n.t('Whether to preserve chapters from source file.') })}>
                        <Switch checked={preserveChapters} onCheckedChange={(v) => { userSettings.preserveChapters = v; }} />
                    </Row>

                    <Row animated label={t('Preserve metadata')} help={() => showHelpText({ text: i18n.t('Whether to preserve metadata from source file. Default: Global (file metadata), per-track and per-chapter metadata will be copied. Non-global: Only per-track and per-chapter metadata will be copied. None: No metadata will be copied') })}>
                        <Select value={preserveMetadata} onValueChange={(v) => { userSettings.preserveMetadata = v as PreserveMetadata; }}>
                            <SelectTrigger size="sm" className="w-32"><SelectValue /></SelectTrigger>
                            <SelectContent position="popper">
                                <SelectItem value={'default' satisfies PreserveMetadata}>{t('Default')}</SelectItem>
                                <SelectItem value={'none' satisfies PreserveMetadata}>{t('None')}</SelectItem>
                                <SelectItem value={'nonglobal' satisfies PreserveMetadata}>{t('Non-global')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </Row>

                    {willMerge && (
                        <>
                            <Row animated label={t('Create chapters from merged segments? (slow)')} help={() => showHelpText({ text: i18n.t('When merging, do you want to create chapters in the merged file, according to the cut segments? NOTE: This may dramatically increase processing time') })}>
                                <Switch checked={segmentsToChapters} onCheckedChange={(v) => { userSettings.segmentsToChapters = v; }} />
                            </Row>
                            <Row animated label={t('Preserve original metadata when merging? (slow)')} help={() => showHelpText({ text: i18n.t('When merging, do you want to preserve metadata from your original file? NOTE: This may dramatically increase processing time') })}>
                                <Switch checked={preserveMetadataOnMerge} onCheckedChange={(v) => { userSettings.preserveMetadataOnMerge = v; }} />
                            </Row>
                        </>
                    )}

                    {areWeCutting && (
                        <>
                            <Row animated label={t('Smart cut (experimental):')} notice={specific.smartCut} help={() => showHelpText({ text: i18n.t('This experimental feature will re-encode the part of the video from the cutpoint until the next keyframe in order to attempt to make a 100% accurate cut. Only works on some files. I\'ve had success with some h264 files, and only a few h265 files. See more here: {{url}}', { url: 'https://github.com/mifi/lossless-cut/issues/126' }) })}>
                                <Switch checked={enableSmartCut} onCheckedChange={(v) => { userSettings.enableSmartCut = v; }} />
                            </Row>

                            {!isEncoding && (
                                <Row animated label={t('Keyframe cut mode')} notice={specific.cutMode} help={() => showHelpText({ text: i18n.t('With "keyframe cut", we will cut at the nearest keyframe before the desired start cutpoint. This is recommended for most files. With "Normal cut" you may have to manually set the cutpoint a few frames before the next keyframe to achieve a precise cut') })}>
                                    <Switch checked={keyframeCut} onCheckedChange={() => toggleKeyframeCut()} />
                                </Row>
                            )}
                        </>
                    )}

                    {isEncoding && (
                        <Row animated label={t('Smart cut auto detect bitrate')}>
                            {encBitrate != null && (
                                <>
                                    <Input className="h-7 w-20" value={encBitrate} onChange={(e) => handleEncBitrateChange(e.target.value)} />
                                    <span>{t('kbit/s')}</span>
                                </>
                            )}
                            <Switch checked={encBitrate == null} onCheckedChange={(checked) => setEncBitrate(checked ? undefined : 10000)} />
                        </Row>
                    )}

                    {lossyMode != null && (
                        <Row animated label={t('Lossy mode')}>
                            <Switch disabled checked />
                            <span>{lossyMode.videoEncoder}</span>
                        </Row>
                    )}

                    {!isEncoding && (
                        <Row animated label={<>&quot;ffmpeg&quot; <code className="px-1 text-xs font-mono bg-muted rounded">avoid_negative_ts</code></>} notice={specific.avoidNegativeTs} help={onAvoidNegativeTsHelpPress}>
                            <Select value={avoidNegativeTs} onValueChange={(v) => { userSettings.avoidNegativeTs = v as AvoidNegativeTs; }}>
                                <SelectTrigger size="sm" className="w-44"><SelectValue /></SelectTrigger>
                                <SelectContent position="popper">
                                    <SelectItem value={'auto' satisfies AvoidNegativeTs}>auto</SelectItem>
                                    <SelectItem value={'make_zero' satisfies AvoidNegativeTs}>make_zero</SelectItem>
                                    <SelectItem value={'make_non_negative' satisfies AvoidNegativeTs}>make_non_negative</SelectItem>
                                    <SelectItem value={'disabled' satisfies AvoidNegativeTs}>disabled</SelectItem>
                                </SelectContent>
                            </Select>
                        </Row>
                    )}

                    <Row animated label={t('"ffmpeg" experimental flag')} help={() => showHelpText({ text: t('Enable experimental ffmpeg features flag?') })}>
                        <Switch checked={ffmpegExperimental} onCheckedChange={(v) => { userSettings.ffmpegExperimental = v; }} />
                    </Row>

                    <Row animated label={t('More settings')}>
                        <Button variant="ghost" size="icon-sm" title={t('Settings')} onClick={() => jotaiDefaultStore.set(settingsVisibleAtom, true)}><SettingsIcon /></Button>
                    </Row>
                </>
            )}
        </div>

        <SheetFooter className="border-t flex-row items-center justify-end gap-2">
            <ToggleExportConfirm />
            <button type="button" className={cn('max-w-36 text-xs text-left leading-tight cursor-pointer', exportConfirmEnabled ? 'text-foreground' : 'text-muted-foreground')} onClick={toggleExportConfirmEnabled}>
                {t('Show this page before exporting?')}
            </button>
            {totalNumWarnings > 0 && <NoticeIcon notice={{ warning: true }} className="size-5" />}
            <ExportButton size="lg" className="ml-2 px-4 text-base" onClick={onExportConfirm} />
        </SheetFooter>
    </>);
}

//---------------------------------------------------------------------------

const adjustCutFromValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const adjustCutToValues = [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface Notice {
    warning?: true;
    text: ReactNode;
}

interface GenericNotice {
    warning?: true;
    text: string;
    url?: string;
}

function NoticeIcon({ notice, className }: { notice: { warning?: boolean | undefined; }; className?: string; }) {
    return notice.warning
        ? <TriangleAlertIcon className={cn('shrink-0 size-4 text-amber-500', className)} />
        : <InfoIcon className={cn('shrink-0 size-4 text-cyan-600 dark:text-cyan-400', className)} />;
}

function NoticeText({ notice }: { notice: Notice | GenericNotice | undefined; }) {
    if (notice == null) return null;
    return (
        <div className={cn('text-xs flex items-center gap-2', notice.warning ? 'text-amber-600 dark:text-amber-400' : 'text-primary')}>
            <NoticeIcon notice={notice} className="size-3.5" />
            <span>{notice.text}</span>
        </div>
    );
}

/** One option row: label (with its notice), control and the help/notice icon */
function Row({ label, notice, help, children, animated }: { label: ReactNode; notice?: Notice | undefined; help?: (() => void) | undefined; children?: ReactNode; animated?: boolean; }) {
    const content = (
        <>
            <div className="flex flex-col gap-1">
                <div>{label}</div>
                <NoticeText notice={notice} />
            </div>
            <div className="flex items-center justify-end gap-2">{children}</div>
            <div className="w-5 flex justify-center">
                {notice != null ? <NoticeIcon notice={notice} /> : help && <HelpIcon onClick={help} />}
            </div>
        </>
    );
    const className = 'py-2 border-b border-border/50 grid grid-cols-[1fr_auto_auto] items-center gap-3';
    if (animated) {
        return <motion.div className={className} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>{content}</motion.div>;
    }
    return <div className={className}>{content}</div>;
}

function ShiftTimes({ values, num, setNum }: { values: number[]; num: number; setNum: (n: number) => void; }) {
    const { t } = useTranslation();
    return (
        <Select value={String(num)} onValueChange={(v) => setNum(Number(v))}>
            <SelectTrigger size="sm" className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent position="popper" className="max-h-72">
                {values.map((v) => <SelectItem key={v} value={String(v)}>{t('{{numFrames}} frames', { numFrames: v >= 0 ? `+${v}` : v, count: v })}</SelectItem>)}
            </SelectContent>
        </Select>
    );
}
