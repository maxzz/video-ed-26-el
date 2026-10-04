import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import { CaptionsIcon } from 'lucide-react';
import { audioStreamsAtom, subtitleStreamsAtom, videoStreamsAtom } from '@/editor/2-file/9-state/file-atoms.ts';
import { Button } from '@/ui/shadcn/button';
import { Label } from '@/ui/shadcn/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/shadcn/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/shadcn/select';
import { Switch } from '@/ui/shadcn/switch';
import { activeAudioStreamIndexesAtom, activeSubtitleStreamIndexAtom, activeVideoStreamIndexAtom } from '../9-state/player-atoms.ts';
import { onActiveAudioStreamsChange, onActiveVideoStreamChange } from '../7-actions/player-actions.ts';
import { onActiveSubtitleChange } from '../7-actions/subtitles.ts';

const defaultValue = 'default';

const toIndex = (value: string) => (value === defaultValue ? undefined : parseInt(value, 10));

function toggleAudioStream(activeAudioStreamIndexes: Set<number>, index: number, checked: boolean) {
    const newActiveAudioStreamIndexes = new Set(activeAudioStreamIndexes);
    if (checked) newActiveAudioStreamIndexes.add(index);
    else newActiveAudioStreamIndexes.delete(index);
    onActiveAudioStreamsChange(newActiveAudioStreamIndexes);
}

/** Port of upstream PlaybackStreamSelector: which tracks to preview (does not affect output) */
export function PlaybackStreamSelector() {
    const { t } = useTranslation();
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground/70" title={t('Tracks')}>
                    <CaptionsIcon className="size-5" />
                </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-72 text-xs flex flex-col gap-3">
                <SubtitleSelect />
                <VideoTrackSelect />
                <AudioTracks />
            </PopoverContent>
        </Popover>
    );
}

function SubtitleSelect() {
    const { t } = useTranslation();
    const subtitleStreams = useAtomValue(subtitleStreamsAtom);
    const activeSubtitleStreamIndex = useAtomValue(activeSubtitleStreamIndexAtom);
    if (subtitleStreams.length === 0) return null;
    return (
        <div className="flex flex-col gap-1">
            <Label className="text-xs">{t('Subtitle')}</Label>
            <Select value={activeSubtitleStreamIndex != null ? String(activeSubtitleStreamIndex) : defaultValue} onValueChange={(v) => onActiveSubtitleChange(toIndex(v))}>
                <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value={defaultValue}>{t('Default')}</SelectItem>
                    {subtitleStreams.map((stream, i) => (
                        <SelectItem key={stream.index} value={String(stream.index)}>#{i + 1} (id {stream.index + 1}) {stream.tags?.language}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

function VideoTrackSelect() {
    const { t } = useTranslation();
    const videoStreams = useAtomValue(videoStreamsAtom);
    const activeVideoStreamIndex = useAtomValue(activeVideoStreamIndexAtom);
    if (videoStreams.length === 0) return null;
    return (
        <div className="flex flex-col gap-1">
            <Label className="text-xs">{t('Video track')}</Label>
            <Select value={activeVideoStreamIndex != null ? String(activeVideoStreamIndex) : defaultValue} onValueChange={(v) => onActiveVideoStreamChange(toIndex(v))}>
                <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value={defaultValue}>{t('Default')}</SelectItem>
                    {videoStreams.map((stream, i) => (
                        <SelectItem key={stream.index} value={String(stream.index)}>#{i + 1} (id {stream.index + 1}) {stream.codec_name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

function AudioTracks() {
    const { t } = useTranslation();
    const audioStreams = useAtomValue(audioStreamsAtom);
    const activeAudioStreamIndexes = useAtomValue(activeAudioStreamIndexesAtom);
    if (audioStreams.length === 0) return null;
    return (
        <div className="flex flex-col gap-1">
            <Label className="text-xs">{t('Audio track')}</Label>
            {audioStreams.map((audioStream, i) => (
                <Label key={audioStream.index} className="text-xs font-normal flex items-center gap-2">
                    <Switch
                        size="sm"
                        checked={activeAudioStreamIndexes.has(audioStream.index)}
                        onCheckedChange={(checked) => toggleAudioStream(activeAudioStreamIndexes, audioStream.index, checked)}
                    />
                    <span>
                        #{i + 1} <span className="text-muted-foreground">(id {audioStream.index + 1}) {audioStream.codec_name} {audioStream.tags?.language}</span>
                    </span>
                </Label>
            ))}
        </div>
    );
}