import { proxy, useSnapshot } from "valtio";
import { useTranslation } from "react-i18next";
import { Button } from "@/ui/shadcn/button";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Label } from "@/ui/shadcn/label";
import { RadioGroup, RadioGroupItem } from "@/ui/shadcn/radio-group";
import i18n from "i18next";

import { openCustomDialog } from "@/components/4-dialogs/7-0-dialogs/dialogs";
import { type Html5ifyMode } from "@shared/types";

/** Port of upstream askForHtml5ifySpeed (useHtml5ify) */
export async function dialogAsync_askForHtml5ifySpeed({ allowedOptions, showRemember, initialOption }: {
    allowedOptions: Html5ifyMode[];
    showRemember?: boolean | undefined;
    initialOption?: Html5ifyMode | undefined;
}) {
    const availOptions = getAvailableOptions();
    const options = allowedOptions.map((value) => [value, availOptions[value]] as const);

    const state = proxy<Html5ifyDialogState>({
        option: initialOption != null && allowedOptions.includes(initialOption) ? initialOption : allowedOptions[0]!,
        remember: !!initialOption,
    });

    return openCustomDialog<Html5ifyChoice>((close) => (
        <Body state={state} options={options} showRemember={!!showRemember} close={close} />
    ));
}

function getAvailableOptions(): Record<Html5ifyMode, string> {
    return {
        'fastest':          /**/ i18n.t('Fastest: FFmpeg-assisted playback'),
        'fast':             /**/ i18n.t('Fast: Full quality remux (no audio), likely to fail'),
        'fast-audio-remux': /**/ i18n.t('Fast: Full quality remux, likely to fail'),
        'fast-audio':       /**/ i18n.t('Fast: Remux video, encode audio (fails if unsupported video codec)'),
        'slow':             /**/ i18n.t('Slow: Low quality encode (no audio)'),
        'slow-audio':       /**/ i18n.t('Slow: Low quality encode'),
        'slowest':          /**/ i18n.t('Slowest: High quality encode'),
    };
}

interface Html5ifyChoice {
    selectedOption: Html5ifyMode;
    rememberChoice: boolean;
}

interface Html5ifyDialogState {
    option: Html5ifyMode;
    remember: boolean;
}

function Body({ state, options, showRemember, close }: {
    state: Html5ifyDialogState;
    options: (readonly [Html5ifyMode, string])[];
    showRemember: boolean;
    close: (value?: Html5ifyChoice) => void;
}) {
    const { t } = useTranslation();
    const snap = useSnapshot(state);

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>{t('Convert to supported format')}</DialogTitle>
                <DialogDescription className="text-xs">
                    {t('These options will let you convert files to a format that is supported by the player. You can try different options and see which works with your file. Note that the conversion is for preview only. When you run an export, the output will still be lossless with full quality')}
                </DialogDescription>
            </DialogHeader>

            <RadioGroup value={snap.option} onValueChange={(value) => { state.option = value as Html5ifyMode; }}>
                {options.map(([value, label]) => (
                    <Label key={value} className="text-xs font-normal flex items-center gap-2">
                        <RadioGroupItem value={value} />
                        {label}
                    </Label>
                ))}
            </RadioGroup>

            {showRemember && (
                <Label className="mt-2 text-xs font-normal flex items-center gap-2">
                    <Checkbox checked={snap.remember} onCheckedChange={(checked) => { state.remember = checked === true; }} />
                    {t('Use this for all files until LosslessCut is restarted?')}
                </Label>
            )}

            <DialogFooter>
                <Button variant="outline" onClick={() => close(undefined)}>{t('Cancel')}</Button>
                <Button onClick={() => close({ selectedOption: state.option, rememberChoice: state.remember })}>{t('OK')}</Button>
            </DialogFooter>
        </DialogContent>
    );
}
