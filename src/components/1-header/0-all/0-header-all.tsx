import { useAtomValue, useSetAtom } from "jotai";
import { MainPage, navigateToPageAtom } from "@/components/5-welcome/a-ui-app-page";
import { AppLogo } from "@/components/5-welcome/2-app-logo";
import { isFileOpenedAtom } from "@/editor/2-file/9-state/a-file-atoms";
import { Button_Export } from "@/editor/7-export/0-ui/3-export-buttons";
import { TopMenu_All } from "../1-top-menu/0-top-menu";
import { ButtonOptions } from "./7-3-btn-options";
import { ButtonThemeToggle } from "./7-2-btn-theme-toggle";
import { ButtonSegments } from "./7-1-btn-segments";

export function Header() {
    const navigate = useSetAtom(navigateToPageAtom);
    const isFileOpened = useAtomValue(isFileOpenedAtom);

    return (
        <header className="px-3 py-1 bg-background border-b border-border flex items-center gap-1">
            <button
                className="shrink-0 -ml-1 px-1 py-0.5 text-sm font-semibold hover:bg-muted rounded flex items-center gap-2 cursor-pointer"
                onClick={() => navigate(MainPage.welcome)}
                title="Show the Welcome page"
                type="button"
            >
                <AppLogo className="size-4.5" iconClasses="stroke-[0.75]!" />
            </button>

            <TopMenu_All />

            <div className="shrink-0 flex items-center gap-1">
                {isFileOpened && <Button_Export size="xs" />}

                <div className="flex items-center gap-px">
                    <ButtonSegments />
                    <ButtonThemeToggle />
                    <ButtonOptions />
                </div>
            </div>
        </header>
    );
}
