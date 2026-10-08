import { useAtomValue } from "jotai";
import { Button } from "@/ui/shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/ui/shadcn/dropdown-menu";
import { FileIcon, FolderIcon, FolderOpenIcon, HistoryIcon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { customOutDirAtom, setCustomOutDir, userSettingsAtom } from "@/editor/0-core/9-state/user-settings";
import { changeOutDir, clearRecentOutDirs } from "../7-actions/8-settings-actions";

/** Working directory picker (upstream OutDirSelector) */
export function DropdownMenu_OutDirSelector() {
    const customOutDir = useAtomValue(customOutDirAtom);
    const { recentCustomOutDirs } = useAtomValue(userSettingsAtom);
    const { t } = useTranslation();

    const history = recentCustomOutDirs.filter((dir) => customOutDir == null || dir !== customOutDir);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="max-w-60" variant="outline" size="sm" title={customOutDir}>
                    {customOutDir ? <FolderIcon /> : <FileIcon />}
                    <span className="truncate">
                        {customOutDir ?? t('Same directory as input file')}
                    </span>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="max-w-96 text-xs" align="end">
                <DropdownMenuLabel className="text-xs">
                    {t('Working directory')}
                </DropdownMenuLabel>

                <DropdownMenuItem onSelect={changeOutDir}>
                    <FolderOpenIcon />
                    {t('Choose directory')}...
                </DropdownMenuItem>

                <DropdownMenuItem disabled={customOutDir == null} onSelect={() => setCustomOutDir(undefined)}>
                    <FileIcon />
                    {t('Same directory as input file')}
                </DropdownMenuItem>

                {history.length > 0 && (<>
                    <DropdownMenuSeparator />
                    {history.map(
                        (dir) => (
                            <DropdownMenuItem key={dir} onSelect={() => setCustomOutDir(dir)} title={dir}>
                                <HistoryIcon />
                                <span className="truncate">
                                    {dir}
                                </span>
                            </DropdownMenuItem>
                        )
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={clearRecentOutDirs}>
                        <XIcon />
                        {t('Clear recents')}
                    </DropdownMenuItem>
                </>)}
            </DropdownMenuContent>

        </DropdownMenu>
    );
}
