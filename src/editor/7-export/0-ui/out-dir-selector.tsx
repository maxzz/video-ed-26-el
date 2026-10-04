import type { ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import { customOutDirAtom, userSettings, userSettingsAtom } from '@/editor/0-core/9-state/user-settings.ts';
import { handleError } from '@/editor/0-core/9-state/working.ts';
import { Button } from '@/ui/shadcn/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/ui/shadcn/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/shadcn/select';
import { changeOutDir, setOutputDir } from '../7-actions/export-actions.ts';

const changeValue = 'llc_choose_directory';
const sameAsInputValue = 'llc_same_as_input';

export function OutDirSelector({ children }: { children: ReactNode; }) {
    const { t } = useTranslation();
    const customOutDir = useAtomValue(customOutDirAtom);
    const { recentCustomOutDirs } = useAtomValue(userSettingsAtom);

    const history = recentCustomOutDirs.filter((dir) => customOutDir == null || dir !== customOutDir);

    function handleChange(value: string) {
        if (value === changeValue) {
            changeOutDir().catch((err: unknown) => handleError({ err }));
        } else {
            setOutputDir(value === sameAsInputValue ? undefined : value).catch((err: unknown) => handleError({ err }));
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>

            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{t('Working directory')}</DialogTitle>
                    <DialogDescription>{t('This is where working files and exported files are stored.')}</DialogDescription>
                </DialogHeader>

                <Select value={customOutDir ?? sameAsInputValue} onValueChange={handleChange}>
                    <SelectTrigger className="w-full min-w-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                        <SelectItem value={changeValue}>{t('Choose directory')}...</SelectItem>
                        {customOutDir != null && <SelectItem value={customOutDir}>{customOutDir}</SelectItem>}
                        <SelectItem value={sameAsInputValue}>{t('Same directory as input file')}</SelectItem>
                        {history.map((dir) => <SelectItem key={dir} value={dir}>{dir}</SelectItem>)}
                    </SelectContent>
                </Select>

                <DialogFooter>
                    <Button variant="outline" onClick={() => { userSettings.recentCustomOutDirs = []; }}>{t('Clear recents')}</Button>
                    <DialogClose asChild>
                        <Button>{t('Done')}</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
