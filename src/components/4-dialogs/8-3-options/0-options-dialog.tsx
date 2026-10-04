import { useAtom, useSetAtom } from "jotai";
import { SettingsIcon } from "lucide-react";
import { settingsVisibleAtom } from "@/editor/1-layout/9-state/panels-atoms";
import { Button } from "@/ui/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { isOpenOptionsDialogAtom } from "./9-types-options";
import { AppOptions } from "./1-app-options";

export function OptionsDialog() {
    const [isOpen, setIsOpen] = useAtom(isOpenOptionsDialogAtom);
    const setSettingsVisible = useSetAtom(settingsVisibleAtom);

    function openEditorSettings() {
        setIsOpen(false);
        setSettingsVisible(true);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-0! max-w-sm! gap-0!" modal>
                <DialogHeader className="px-4 py-3 text-left border-b gap-0">
                    <DialogTitle className="text-sm">
                        Options
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Application settings
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4 py-4 flex flex-col gap-4">
                    <AppOptions />
                </div>

                <DialogFooter className="m-0 px-4 py-3 flex-row justify-end">
                    <Button variant="outline" size="sm" onClick={openEditorSettings}>
                        <SettingsIcon />
                        Editor settings
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
