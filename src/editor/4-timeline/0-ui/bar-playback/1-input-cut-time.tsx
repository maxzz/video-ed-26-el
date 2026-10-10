import { useState, type ClipboardEvent, type KeyboardEvent, type SubmitEvent } from "react";
import { useAtomValue } from "jotai";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { cn } from "@/utils/classnames";
import { useTranslation } from "react-i18next";

import { mainApi } from "@/editor/0-core/7-actions/0-main-api";
import { formatTimecodeAtom, parseTimecode } from "@/editor/0-core/9-state/timecode";
import { isExactDurationMatch } from "@/editor/0-core/8-lib/duration";
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

/** Set-cutpoint button. The down arrow opens the time field that used to sit beside it. */
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

    function toggleInput() {
        if (open) {
            setManual(side, undefined);
        }
        setOpen((value) => !value);
    }

    const revealTitle = isStart
        ? t('Manually input current segment\'s start time')
        : t('Manually input current segment\'s end time');

    return (
        <div className={cn(isStart ? 'mr-1.25' : 'ml-1.25', 'flex items-center gap-1.25')}>
            {!isStart && open && <Input_CutTime side={side} autoFocus onDismiss={() => setOpen(false)} />}

            <Button_SetCutpoint
                currentCutSeg={currentCutSeg}
                side={side}
                onClick={onSetCut}
                title={title}
                revealed={open}
                revealTitle={revealTitle}
                onToggleReveal={toggleInput}
            />

            {isStart && open && <Input_CutTime side={side} autoFocus onDismiss={() => setOpen(false)} />}
        </div>
    );
}

export function Input_CutTime({ side, autoFocus, onDismiss }: { side: Side; autoFocus?: boolean; onDismiss?: () => void; }) {
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
        <form onSubmit={(e) => handleSubmit(side, e)}>
            <input
                className={cn(
                    'px-1 py-px w-23.5 text-[13px] font-mono text-center tracking-tighter bg-muted outline-none rounded-[5px]',
                    error ? 'text-destructive' : (cutTimeManual !== undefined ? 'text-foreground' : 'text-muted-foreground'),
                )}
                style={{ border }}
                disabled={!isFileOpened}
                value={value}
                autoFocus={autoFocus}
                onChange={(e) => handleCutTimeInput(side, e.target.value)}
                onPaste={(e) => handleCutTimePaste(side, e)}
                onBlur={() => dismissCutTime(side, onDismiss)}
                onKeyDown={(e) => dismissCutTimeOnEscape(e, onDismiss)}
                onContextMenu={() => { void handleContextMenu(side); }}
                title={isStart ? t('Manually input current segment\'s start time') : t('Manually input current segment\'s end time')}
                type="text"
            />
        </form>
    );
}

//---------------------------------------------------------------------------

function dismissCutTime(side: Side, onDismiss?: () => void) {
    setManual(side, undefined);
    onDismiss?.();
}

function dismissCutTimeOnEscape(e: KeyboardEvent<HTMLInputElement>, onDismiss?: () => void) {
    if (e.key !== 'Escape' || onDismiss == null) {
        return;
    }
    e.currentTarget.blur();
}

function setManual(side: Side, text: string | undefined, error = false) {
    jotaiDefaultStore.set(cutTimeManualAtoms[side], text);
    jotaiDefaultStore.set(cutTimeErrorAtoms[side], error);
}

function handleSubmit(side: Side, e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const cutTimeManual = jotaiDefaultStore.get(cutTimeManualAtoms[side]);
    try {
        if (isEmptyEndTime(side, cutTimeManual)) {
            setTime(side, undefined);
            return;
        }
        const timeWithOffset = cutTimeManual != null ? parseTimecode(cutTimeManual) : undefined;
        if (timeWithOffset === undefined) {
            return;
        }
        setTime(side, timeWithOffset);
    } catch (err) {
        console.warn('Cannot submit cut time', err);
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

function handleCutTimeInput(side: Side, text: string) {
    try {
        if (isExactDurationMatch(text) || isEmptyEndTime(side, text)) {
            parseAndSetCutTime(side, text);
            return;
        }
    } catch (err) {
        console.warn(err);
        jotaiDefaultStore.set(cutTimeErrorAtoms[side], true);
    }
    // else or if error, just set manual value, to make sure it doesn't jump to end https://github.com/mifi/lossless-cut/issues/988#issuecomment-3475870072
    jotaiDefaultStore.set(cutTimeManualAtoms[side], text);
}

function setFromText(side: Side, text: string) {
    try {
        jotaiDefaultStore.set(cutTimeManualAtoms[side], text);
        parseAndSetCutTime(side, text);
        jotaiDefaultStore.set(cutTimeErrorAtoms[side], false);
    } catch (err) {
        console.warn(err);
        jotaiDefaultStore.set(cutTimeErrorAtoms[side], true);
    }
}

function handleCutTimePaste(side: Side, e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    setFromText(side, e.clipboardData.getData('Text'));
}

async function handleContextMenu(side: Side) {
    const text = await mainApi.readClipboardText();
    if (text) {
        setFromText(side, text);
    }
}

function parseAndSetCutTime(side: Side, text: string) {
    if (isEmptyEndTime(side, text)) {
        setTime(side, undefined);
        return;
    }
    // Don't proceed if not a valid time value
    const timeWithOffset = parseTimecode(text);
    if (timeWithOffset === undefined) {
        return;
    }
    setTime(side, timeWithOffset);
}

function isEmptyEndTime(side: Side, v: string | undefined) {
    return side === 'end' && v?.trim() === '';
}
