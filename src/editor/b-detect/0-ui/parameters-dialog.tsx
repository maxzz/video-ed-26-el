import type { FormEvent } from 'react';
import { proxy, useSnapshot } from 'valtio';
import { useTranslation } from 'react-i18next';
import { LinkIcon } from 'lucide-react';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { Label } from '@/ui/shadcn/label';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/shadcn/dialog';
import { openCustomDialog } from '@/editor/0-core/0-state/dialogs.ts';
import { mainApi } from '@/editor/0-core/2-lib/main-api.ts';
import { type FfmpegDialog, getHint, getLabel } from '@/editor/0-core/2-lib/ffmpeg/ffmpeg-parameters.ts';
import type { ParameterDialogParameters } from '../0-state/detect-atoms.ts';

interface ParametersDialogOptions {
    title?: string | undefined;
    description?: string | undefined;
    dialogType: FfmpegDialog;
    parameters: ParameterDialogParameters;
    docUrl?: string | undefined;
}

/** Port of upstream useSegments showParametersDialog. Resolves the edited parameters, or undefined if cancelled */
export function showParametersDialog(options: ParametersDialogOptions) {
    const state = proxy({ ...options.parameters });
    return openCustomDialog<ParameterDialogParameters>((close) => <ParametersDialogContent options={options} state={state} close={close} />);
}

function ParametersDialogContent({ options: { title, description, dialogType, parameters, docUrl }, state, close }: {
    options: ParametersDialogOptions;
    state: ParameterDialogParameters;
    close: (value?: ParameterDialogParameters) => void;
}) {
    const { t } = useTranslation();
    const snap = useSnapshot(state, { sync: true });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        close({ ...state });
    }

    return (
        <DialogContent className="sm:max-w-[80vw]">
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className={description ? undefined : 'sr-only'}>{description ?? title}</DialogDescription>
            </DialogHeader>

            {docUrl && (
                <div>
                    <Button variant="outline" size="sm" onClick={() => mainApi.openExternal(docUrl)}>
                        <LinkIcon /> {t('Read more')}
                    </Button>
                </div>
            )}

            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
                {Object.keys(parameters).map((key, i) => {
                    const id = `parameter-${key}`;
                    const hint = getHint(dialogType, key);
                    return (
                        <div key={key} className="flex flex-col gap-1">
                            <Label htmlFor={id} className="font-mono">{getLabel(dialogType, key) || key}</Label>
                            <Input id={id} autoFocus={i === 0} value={snap[key] ?? ''} onChange={(e) => { state[key] = e.target.value; }} />
                            {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
                        </div>
                    );
                })}

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => close(undefined)}>{t('Cancel')}</Button>
                    <Button type="submit">{t('Confirm')}</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
