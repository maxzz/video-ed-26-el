import { type DragEvent, Fragment } from "react";
import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { jotaiDefaultStore } from "@/utils/local-utils/9-jotai-default-store";
import { cn } from "@/utils/classnames";
import { Button } from "@/ui/shadcn/button";
import { Kbd } from "@/ui/shadcn/kbd";
import { MouseIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { userSettings } from "@/editor/0-core/9-state/user-settings";

import { type ModifierKey } from "@shared/types";
import { runAction } from "@/editor/0-core/7-actions/kbd-actions";
import { getKeyDisplayName, getMetaKeyName, splitKeyboardKeys } from "@/editor/0-core/8-lib/utils-kbd";
import { draggingOverDropZoneAtom } from "../9-state/player-atoms";
import { MifiLink } from "@/editor/f-platform/0-ui/mifi-link";

/** Port of upstream NoFileLoaded: drop zone + hints. Clicking opens the file dialog. The drop itself bubbles up to PlayerView */
export function NoFileLoaded() {
    const { t } = useTranslation();
    const dragging = useAtomValue(draggingOverDropZoneAtom);
    const { simpleMode, segmentMouseModifierKey, keyBindings, darkMode } = useSnapshot(userSettings);
    const keysForAction = (action: string) => keyBindings.find((binding) => binding.action === action)?.keys;

    return (
        <div
            className={cn(
                'absolute inset-0 whitespace-nowrap select-none m-8 text-muted-foreground transition-colors border-[0.7em] border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer',
                dragging ? 'border-muted-foreground/60' : 'border-muted',
            )}
            onClick={() => runAction('openFilesDialog')}
            onDragOver={onDragOver}
            onDragLeave={() => setDragging(false)}
            onDrop={() => setDragging(false)}
            tabIndex={-1}
            role="button"
        >
            <div className="text-2xl uppercase">
                {t('DROP FILE(S)')}
            </div>

            <div className="text-lg">
                {t('See Help menu for help')}
            </div>

            <div className="text-sm flex items-center gap-1">
                <Keys keys={keysForAction('setCutStart')} /> <Keys keys={keysForAction('setCutEnd')} />
                <span>
                    {t('or')}
                </span>
                <Kbd>
                    {getModifierName(segmentMouseModifierKey)}
                </Kbd>
                +
                <MouseIcon className="size-4" />
                <span>
                    {t('to set cutpoints')}
                </span>
            </div>

            <div className="text-sm flex items-center gap-2" role="presentation" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" onClick={() => { userSettings.simpleMode = !simpleMode; }}>
                    {simpleMode ? t('Simple') : t('Advanced')}
                </Button>

                {simpleMode ? t('to show advanced view') : t('to show simple view')}
            </div>

            <div role="presentation" onClick={(e) => e.stopPropagation()}>
                <MifiLink darkMode={darkMode} />
            </div>
        </div>
    );
}

function Keys({ keys }: { keys: string | undefined; }) {
    if (keys == null || keys === '') {
        return <Kbd>UNBOUND</Kbd>;
    }

    const split = splitKeyboardKeys(keys);
    return split.map(
        (key, i) => (
            <Fragment key={key}>
                <Kbd>
                    {getKeyDisplayName(key, emptyLayoutMap)}
                </Kbd>
                {i < split.length - 1 && <span className="text-xs">+</span>}
            </Fragment>
        )
    );
}

const emptyLayoutMap = new Map<string, string>();

function getModifierName(key: ModifierKey) {
    if (key === 'ctrl') return 'Ctrl';
    if (key === 'shift') return 'Shift';
    if (key === 'alt') return 'Alt';
    return getMetaKeyName();
}

function onDragOver(e: DragEvent) {
    e.preventDefault();
    setDragging(true);
}

const setDragging = (dragging: boolean) => jotaiDefaultStore.set(draggingOverDropZoneAtom, dragging);
