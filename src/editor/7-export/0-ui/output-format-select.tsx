import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { detectedFileFormatAtom, fileFormatAtom } from "@/editor/2-file/9-state/a-file-atoms";
import { onOutputFormatUserChange } from "../7-actions/export-actions";
import allOutFormats, { type FfmpegFormat } from "@/editor/0-core/8-lib/ffmpeg/out-formats";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { cn } from "@/utils/classnames";

const commonVideoAudioFormats = ['matroska', 'mov', 'mp4', 'mpegts', 'ogv', 'webm'] as const;
const commonAudioFormats = ['flac', 'ipod', 'mp3', 'oga', 'ogg', 'opus', 'wav'] as const;
const commonSubtitleFormats = ['ass', 'srt', 'sup', 'webvtt'] as const;
const allFormatKeys = Object.keys(allOutFormats) as FfmpegFormat[];
const formatNames = allOutFormats as Record<string, string>;

function FormatItems({ formats }: { formats: readonly string[]; }) {
    return formats.map((format) => (
        <SelectItem key={format} value={format}>{format} - {formatNames[format]}</SelectItem>
    ));
}

/** Upstream App.tsx renderOutFmt(): the output format of the current file */
export function CurrentFileOutputFormatSelect({ className }: { className?: string; }) {
    const detectedFileFormat = useAtomValue(detectedFileFormatAtom);
    const fileFormat = useAtomValue(fileFormatAtom);
    return <OutputFormatSelect className={className} detectedFileFormat={detectedFileFormat} fileFormat={fileFormat} onOutputFormatUserChange={onOutputFormatUserChange} />;
}

export function OutputFormatSelect({ className, disabled, detectedFileFormat, fileFormat, onOutputFormatUserChange }: {
    className?: string;
    disabled?: boolean;
    detectedFileFormat?: string | undefined;
    fileFormat?: string | undefined;
    onOutputFormatUserChange: (format: string) => void;
}) {
    const { t } = useTranslation();

    const notDetected = (f: string) => f !== detectedFileFormat;
    const commonFormatsAndDetectedFormat = new Set<string | undefined>([...commonVideoAudioFormats, ...commonAudioFormats, ...commonSubtitleFormats, detectedFileFormat]);
    const otherFormats = allFormatKeys.filter((format) => !commonFormatsAndDetectedFormat.has(format));

    return (
        <Select disabled={disabled} value={fileFormat ?? ''} onValueChange={onOutputFormatUserChange}>
            <SelectTrigger size="sm" className={cn('min-w-0', className)} title={t('Output container format:')}>
                <SelectValue placeholder={t('Output container format:')}>{fileFormat}</SelectValue>
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-96">
                {detectedFileFormat && (
                    <SelectItem value={detectedFileFormat}>
                        {detectedFileFormat} - {formatNames[detectedFileFormat]} {t('(detected)')}
                    </SelectItem>
                )}

                <SelectGroup>
                    <SelectLabel>{t('Common video/audio formats:')}</SelectLabel>
                    <FormatItems formats={commonVideoAudioFormats.filter(notDetected)} />
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                    <SelectLabel>{t('Common audio formats:')}</SelectLabel>
                    <FormatItems formats={commonAudioFormats.filter(notDetected)} />
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                    <SelectLabel>{t('Common subtitle formats:')}</SelectLabel>
                    <FormatItems formats={commonSubtitleFormats.filter(notDetected)} />
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                    <SelectLabel>{t('All other formats:')}</SelectLabel>
                    <FormatItems formats={otherFormats} />
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}
