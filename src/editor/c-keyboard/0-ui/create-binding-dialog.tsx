import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { RotateCcwIcon, SaveIcon, TriangleAlertIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Button } from "@/ui/shadcn/button";
import { creatingBindingAtom, recordedKeysAtom } from "../9-state/keyboard-atoms";
import { addRecordedKey, clearRecordedKeys, confirmNewKeyBinding, stopCreatingBinding } from "../7-actions/key-bindings";
import { fixKeys, getActionsMap } from "../8-lib/actions-map";
import { KeyCombo } from "./key-combo";

/** "Bind new key to action". Key presses are recorded by the global keyboard listener while this is open */
export function CreateBindingDialog() {
    const { t } = useTranslation();
    const action = useAtomValue(creatingBindingAtom);
    const keysDown = useAtomValue(recordedKeysAtom);

    const validKeys = fixKeys(keysDown);
    const isComboInvalid = validKeys.length === 0 && keysDown.length > 0;

    return (
        <Dialog open={action != null} onOpenChange={(open) => !open && stopCreatingBinding()}>
            <DialogContent className="p-0 max-w-lg text-xs gap-0">
                <DialogHeader className="px-4 py-3 border-b">
                    <DialogTitle className="text-sm">{t('Bind new key to action')}</DialogTitle>
                    <DialogDescription className="sr-only">{t('Bind new key to action')}</DialogDescription>
                </DialogHeader>

                {action != null && (
                    <div className="px-4 py-3 flex flex-col gap-3">
                        <p>
                            {t('Action:')} {getActionsMap()[action]?.name} <span className="ml-1 text-muted-foreground">{action}</span>
                        </p>
                        <p>{t('Please press your desired key combination. Make sure it doesn\'t conflict with any other binding or system hotkeys.')}</p>

                        <div className="min-h-8 flex items-center">
                            <KeyCombo keys={validKeys.length > 0 ? validKeys : keysDown} />
                        </div>

                        <AnimatePresence>
                            {isComboInvalid && (
                                <motion.div
                                    className="text-amber-600 dark:text-amber-400 overflow-hidden flex items-center gap-1.5"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                >
                                    <TriangleAlertIcon className="size-3.5" />
                                    {t('Combination is invalid')}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex flex-wrap gap-2">
                            {!keysDown.includes('Escape') && (
                                <Button variant="outline" size="xs" onClick={() => addRecordedKey('Escape')}>ESC</Button>
                            )}
                            {keysDown.length > 0 && (
                                <Button variant="outline" size="xs" onClick={clearRecordedKeys}>
                                    <RotateCcwIcon />
                                    {t('Start over')}
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter className="m-0 px-4 py-3">
                    <Button
                        size="sm"
                        disabled={validKeys.length === 0}
                        onClick={() => action != null && confirmNewKeyBinding(action, validKeys)}
                    >
                        <SaveIcon />
                        {t('Save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
