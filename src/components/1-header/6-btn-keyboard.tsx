import { useTranslation } from "react-i18next";
import { CommandIcon, KeyboardIcon } from "lucide-react";
import { isMac } from "@/editor/0-core/2-lib/main-api";
import { toggleKeyboardShortcuts } from "@/editor/1-layout/0-state/panels-atoms";
import { toggleCommandPalette } from "@/editor/c-keyboard";
import { Button } from "@/ui/shadcn/button";

export function ButtonCommandPalette() {
    const { t } = useTranslation();

    return (
        <Button
            className="size-6 rounded"
            variant="ghost"
            size="icon"
            onClick={toggleCommandPalette}
            title={`${t("Command palette")} (${isMac ? "⌘K" : "Ctrl+K"})`}
            type="button"
        >
            <CommandIcon className="size-3.5" />
        </Button>
    );
}

export function ButtonKeyboardShortcuts() {
    const { t } = useTranslation();

    return (
        <Button
            className="size-6 rounded"
            variant="ghost"
            size="icon"
            onClick={toggleKeyboardShortcuts}
            title={t("Keyboard & mouse shortcuts")}
            type="button"
        >
            <KeyboardIcon className="size-3.5" />
        </Button>
    );
}
