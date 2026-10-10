import { useState, type ClipboardEvent, type KeyboardEvent, type SubmitEvent } from "react";
import { useAtomValue } from "jotai";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { cn } from "@/utils/classnames";
import { useTranslation } from "react-i18next";
import { CheckIcon, XIcon } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { Popover, PopoverContent } from "@/ui/shadcn/popover";

import { mainApi } from "@/editor/0-core/7-actions/0-main-api";
import { formatTimecodeAtom, parseTimecode } from "@/editor/0-core/9-state/timecode";
import { isFileOpenedAtom, startTimeOffsetAtom } from "@/editor/2-file/9-state/a-file-atoms";
import { seekAbs } from "@/editor/3-player/7-actions/player-actions";
import { type SegmentColorIndex } from "@/editor/0-core/8-lib/9-types-core";
import { currentCutSegAtom } from "@/editor/5-segments/9-state/a-segments-store";
import { darkModeAtom, getSegColorAtom, simpleModeAtom } from "@/editor/5-segments/9-state/a-seg-ui-atoms";
import { setCutTime } from "@/editor/5-segments/7-actions/segment-actions";
import { cutTimeErrorAtoms, cutTimeManualAtoms } from "../../9-state/bottom-bar-atoms";
import { Button_SetCutpoint } from "./2-button-segment-cut";
import { type Side } from "./9-types-playbar";

// Port of upstream BottomBar.tsx CutTimeInput

/** Set-cutpoint button. The down arrow opens a time popup under the button. */
export function Control_CutTime({ side, currentCutSeg, onSetCut, title }: {
    side: Side;
    currentCutSeg: SegmentColorIndex | undefined;
    onSetCut: () => unknown;
    title: string;
}) {
    const simpleMode = useAtomValue(simpleModeAtom);
    const [open, setOpen] = useState(false);
    const isStart = side === 'start';
    const { t } = useTranslation();

    if (simpleMode) {
        return (
            <Button_SetCutpoint
                className={isStart ? 'mr-1.25' : 'ml-1.25'}
                currentCutSeg={currentCutSeg}
                side={side}
                onClick={onSetCut}
                title={title}
            />
        );
    }

    function closePopup() {
        setManual(side, undefined);
        setOpen(false);
    }

    const revealTitle = isStart
        ? t('Manually input current segment\'s start time')
        : t('Manually input current segment\'s end time');

    return (
        <Popover open={open} onOpenChange={(next) => next ? setOpen(true) : closePopup()}>
            <div className={isStart ? 'mr-1.25' : 'ml-1.25'}>
                <Button_SetCutpoint
                    currentCutSeg={currentCutSeg}
                    side={side}
                    onClick={onSetCut}
                    title={title}
                    revealed={open}
                    revealTitle={revealTitle}
                    popover
                />
            </div>

            <PopoverContent
                side="bottom"
                align="center"
                sideOffset={6}
                className="p-1 w-auto flex-row items-center gap-1"
            >
                <Input_CutTime side={side} onApplied={() => setOpen(false)} onCancel={closePopup} />
            </PopoverContent>
        </Popover>
    );
}

function Input_CutTime({ side, onApplied, onCancel }: { side: Side; onApplied: () => void; onCancel: () => void; }) {
    const isFileOpened = useAtomValue(isFileOpenedAtom);
    const currentCutSeg = useAtomValue(currentCutSegAtom);
    const cutTimeManual = useAtomValue(cutTimeManualAtoms[side]);
    const error = useAtomValue(cutTimeErrorAtoms[side]);
    const startTimeOffset = useAtomValue(startTimeOffsetAtom);
    const formatTimecode = useAtomValue(formatTimecodeAtom);
    const darkMode = useAtomValue(darkModeAtom);
    const getSegColor = useAtomValue(getSegColorAtom);
    const { t } = useTranslation();

    const isStart = side === 'start';
    const cutTime = isStart ? currentCutSeg?.start : currentCutSeg?.end;
    const segColor = getSegColor(currentCutSeg);
    const border = `.1em solid ${darkMode ? segColor.desaturate(0.4).lightness(50).string() : segColor.desaturate(0.2).lightness(60).string()}`;

    let value: string;
    if (cutTimeManual !== undefined) {
        value = cutTimeManual;
    } else if (cutTime == null) {
        value = formatTimecode({ seconds: 0 }); // marker, see https://github.com/mifi/lossless-cut/issues/2590
    } else {
        value = formatTimecode({ seconds: cutTime + startTimeOffset });
    }

    return (
        <form className="flex items-center gap-1" onSubmit={(e) => submitCutTime(side, e, onApplied)} onKeyDown={(e) => cancelCutTimeOnEscape(e, onCancel)}>
            <input
                name="cut-time"
                className={cn(
                    'px-1 py-px w-23.5 text-[13px] font-mono text-center tracking-tighter bg-muted outline-none rounded-[5px]',
                    error ? 'text-destructive' : (cutTimeManual !== undefined ? 'text-foreground' : 'text-muted-foreground'),
                )}
                style={{ border }}
                disabled={!isFileOpened}
                value={value}
                autoFocus
                onChange={(e) => setDraft(side, e.target.value)}
                onPaste={(e) => handleCutTimePaste(side, e)}
                onContextMenu={() => { void handleContextMenu(side); }}
                title={isStart ? t('Manually input current segment\'s start time') : t('Manually input current segment\'s end time')}
                type="text"
            />

            <Button type="submit" size="icon-xs" disabled={!isFileOpened} title={t('OK')} aria-label={t('OK')}>
                <CheckIcon />
            </Button>
            <Button type="button" size="icon-xs" variant="outline" onClick={onCancel} title={t('Cancel')} aria-label={t('Cancel')}>
                <XIcon />
            </Button>
        </form>
    );
}

//---------------------------------------------------------------------------

function cancelCutTimeOnEscape(e: KeyboardEvent<HTMLElement>, onCancel: () => void) {
    if (e.key !== 'Escape') {
        return;
    }
    e.preventDefault();
    e.stopPropagation();
    onCancel();
}

function setDraft(side: Side, text: string) {
    setManual(side, text);
}

function setManual(side: Side, text: string | undefined, error = false) {
    jotaiDefaultStore.set(cutTimeManualAtoms[side], text);
    jotaiDefaultStore.set(cutTimeErrorAtoms[side], error);
}

function submitCutTime(side: Side, e: SubmitEvent<HTMLFormElement>, onApplied: () => void) {
    e.preventDefault();
    const field = e.currentTarget.elements.namedItem('cut-time');
    const text = field instanceof HTMLInputElement ? field.value : '';
    if (commitCutTime(side, text)) {
        onApplied();
    }
}

function commitCutTime(side: Side, text: string) {
    try {
        if (isEmptyEndTime(side, text)) {
            setTime(side, undefined);
            return true;
        }
        const timeWithOffset = parseTimecode(text);
        if (timeWithOffset === undefined) {
            setManual(side, text, true);
            return false;
        }
        setTime(side, timeWithOffset);
        return true;
    } catch (err) {
        console.warn('Cannot submit cut time', err);
        setManual(side, text, true);
        return false;
    }
}

// Note: If we get an error from setCutTime, remain in the editing state (cutTimeManual)
// https://github.com/mifi/lossless-cut/issues/988
function setTime(side: Side, timeWithOffset: number | undefined) {
    if (timeWithOffset == null) { // clear time
        setCutTime('end', undefined);
        setManual(side, undefined);
        return;
    }
    const timeWithoutOffset = Math.max(timeWithOffset - jotaiDefaultStore.get(startTimeOffsetAtom), 0);
    setCutTime(side, timeWithoutOffset);
    seekAbs(timeWithoutOffset);
    setManual(side, undefined);
}

//---------------------------------------------------------------------------

function handleCutTimePaste(side: Side, e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    setDraft(side, e.clipboardData.getData('Text'));
}

async function handleContextMenu(side: Side) {
    const text = await mainApi.readClipboardText();
    if (text) {
        setDraft(side, text);
    }
}

function isEmptyEndTime(side: Side, v: string | undefined) {
    return side === 'end' && v?.trim() === '';
}
