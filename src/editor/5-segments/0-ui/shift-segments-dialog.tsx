import type { FormEvent } from 'react';
import { proxy, useSnapshot } from 'valtio';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { Label } from '@/ui/shadcn/label';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/shadcn/dialog';
import { openCustomDialog } from '@/editor/0-core/9-state/dialogs.ts';

// Port of upstream openShiftSegmentsDialog (GenericDialog.tsx)

type ShiftResult = { startShift?: number; endShift?: number; };

export function openShiftSegmentsDialog({ inputPlaceholder, parseTimecode }: { inputPlaceholder: string; parseTimecode: (s: string) => number | undefined; }) {
    const state = proxy({ start: '', end: '' });
    return openCustomDialog<ShiftResult>((close) => <ShiftSegmentsDialog state={state} inputPlaceholder={inputPlaceholder} parseTimecode={parseTimecode} close={close} />);
}

function ShiftSegmentsDialog({ state, inputPlaceholder, parseTimecode, close }: {
    state: { start: string; end: string; };
    inputPlaceholder: string;
    parseTimecode: (s: string) => number | undefined;
    close: (value?: ShiftResult) => void;
}) {
    const { t } = useTranslation();
    const snap = useSnapshot(state, { sync: true });

    function parseValue(value: string) {
        let parseableValue = value.trim();
        if (!parseableValue) return undefined;
        let sign = 1;
        if (parseableValue.startsWith('-')) {
            sign = -1;
            parseableValue = parseableValue.slice(1);
        }
        const duration = parseTimecode(parseableValue);
        if (duration == null || Number.isNaN(duration)) throw new Error('Invalid timecode');
        if (duration === 0) return undefined;
        return duration * sign;
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        try {
            const startShift = parseValue(state.start);
            const endShift = parseValue(state.end);
            // require at least one of them to be set
            if (startShift == null && endShift == null) return;
            close({ ...(startShift != null && { startShift }), ...(endShift != null && { endShift }) });
        } catch (err) {
            console.warn(err);
        }
    }

    return (
        <DialogContent className="sm:max-w-[50vw]">
            <DialogHeader>
                <DialogTitle>{t('Shift segments')}</DialogTitle>
                <DialogDescription>{t('Shift all segments on the timeline by this amount. Negative values will be shifted back, while positive value will be shifted forward in time.')}</DialogDescription>
            </DialogHeader>

            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
                <Label className="flex flex-col items-start gap-1">
                    {t('Shift start by')}
                    <Input value={snap.start} placeholder={inputPlaceholder} autoFocus onChange={(e) => { state.start = e.target.value; }} />
                </Label>
                <Label className="flex flex-col items-start gap-1">
                    {t('Shift end by')}
                    <Input value={snap.end} placeholder={inputPlaceholder} onChange={(e) => { state.end = e.target.value; }} />
                </Label>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => close(undefined)}>{t('Cancel')}</Button>
                    <Button type="submit">{t('Confirm')}</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
