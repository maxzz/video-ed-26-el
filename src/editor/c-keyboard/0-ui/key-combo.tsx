import { Fragment } from "react";
import { useAtomValue } from "jotai";
import { PlusIcon } from "lucide-react";
import { cn } from "@/utils/classnames";
import { Kbd } from "@/ui/shadcn/kbd";
import { getKeyDisplayName, splitKeyboardKeys } from "@/editor/0-core/8-lib/utils-kbd";
import { keyboardLayoutMapAtom } from "../9-state/keyboard-atoms";

/** A single key code shown with the character of the user's keyboard layout (upstream Kbd) */
export function KeyCode({ code, className }: { code: string; className?: string; }) {
    const keyboardLayoutMap = useAtomValue(keyboardLayoutMapAtom);
    const keyName = getKeyDisplayName(code, keyboardLayoutMap);
    if (keyName == null) return null;
    return <Kbd className={cn('text-foreground/80 bg-muted border', className)}>{keyName}</Kbd>;
}

/** Key codes joined with plus signs, e.g. a binding like `ShiftLeft+KeyJ` */
export function KeyCombo({ keys, className }: { keys: string | string[]; className?: string; }) {
    const codes = typeof keys === 'string' ? splitKeyboardKeys(keys) : keys;
    return (
        <span className={cn('inline-flex items-center gap-1', className)}>
            {codes.map((code, i) => (
                <Fragment key={code}>
                    {i > 0 && <PlusIcon className="size-2.5 opacity-60" />}
                    <KeyCode code={code} />
                </Fragment>
            ))}
        </span>
    );
}
