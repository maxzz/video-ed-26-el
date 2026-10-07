import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { Volume2Icon, VolumeXIcon } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/shadcn/popover";
import { Slider } from "@/ui/shadcn/slider";
import { playbackVolumeAtom } from "../9-state/player-atoms";
import { toggleMuted } from "../7-actions/player-actions";
import { setPlaybackVolume } from "../7-actions/video-events";

/** Port of upstream VolumeControl: preview volume only, does not affect output */
export function VolumeControl() {
    const { t } = useTranslation();
    const playbackVolume = useAtomValue(playbackVolumeAtom);
    const VolumeIcon = playbackVolume === 0 ? VolumeXIcon : Volume2Icon;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground/70" title={t('Mute preview? (will not affect output)')}>
                    <VolumeIcon className="size-5" />
                </Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="p-2 w-56 flex items-center gap-2" onOpenAutoFocus={(e) => e.preventDefault()}>
                <Button variant="ghost" size="icon-sm" onClick={toggleMuted} title={t('Mute preview? (will not affect output)')}>
                    <VolumeIcon />
                </Button>
                <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[playbackVolume * 100]}
                    onValueChange={([value]) => setPlaybackVolume((value ?? 0) / 100)}
                />
            </PopoverContent>
        </Popover>
    );
}
