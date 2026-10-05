import { type FormEvent } from 'react';
import { useAtomValue } from 'jotai';
import { useSnapshot } from 'valtio';
import i18n from 'i18next';
import { CircleAlertIcon, CircleCheckIcon, CircleHelpIcon, InfoIcon, TriangleAlertIcon } from 'lucide-react';
import { classNames } from '@/utils';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { Textarea } from '@/ui/shadcn/textarea';
import { Checkbox } from '@/ui/shadcn/checkbox';
import { Label } from '@/ui/shadcn/label';
import { RadioGroup, RadioGroupItem } from '@/ui/shadcn/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/shadcn/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/shadcn/dialog';
import { type DialogEntry, type DialogIcon, type FireDialogInputState, type FireDialogOptions, dialogStackAtom } from '../../../components/4-dialogs/7-0-dialogs/dialogs.ts';

export function DialogHost() {
    const stack = useAtomValue(dialogStackAtom);
    return (<>
        {stack.map((entry) => (
            entry.kind === 'fire'
                ? <FireDialog key={entry.id} entry={entry} />
                : <CustomDialog key={entry.id} entry={entry} />
        ))}
    </>);
}

function CustomDialog({ entry }: { entry: Extract<DialogEntry, { kind: 'custom'; }>; }) {
    return (
        <Dialog open onOpenChange={(open) => !open && entry.resolve(undefined)}>
            {entry.render(entry.resolve)}
        </Dialog>
    );
}

function FireDialog({ entry }: { entry: Extract<DialogEntry, { kind: 'fire'; }>; }) {
    const { options, input, resolve } = entry;
    const {
        title, text, html, icon,
        showConfirmButton = true, showCancelButton, showDenyButton, showCloseButton,
        confirmButtonText, cancelButtonText, denyButtonText,
        reverseButtons, focusCancel, allowOutsideClick = true, allowEscapeKey = true, dangerConfirm, className,
    } = options;

    function dismiss() {
        resolve({ isConfirmed: false, isDenied: false, isDismissed: true });
    }

    function confirm(e?: FormEvent) {
        e?.preventDefault();
        if (options.input === 'checkbox') {
            resolve({ isConfirmed: true, isDenied: false, isDismissed: false, value: input.checked });
            return;
        }
        if (options.input) {
            const error = options.inputValidator?.(input.value);
            if (error) {
                input.error = error;
                return;
            }
            resolve({ isConfirmed: true, isDenied: false, isDismissed: false, value: input.value });
            return;
        }
        resolve({ isConfirmed: true, isDenied: false, isDismissed: false, value: 'true' });
    }

    function deny() {
        resolve({ isConfirmed: false, isDenied: true, isDismissed: false });
    }

    const buttons = [
        showConfirmButton && (
            <Button key="confirm" type="submit" variant={dangerConfirm ? 'destructive' : 'default'} className="min-w-16" autoFocus={!focusCancel && !options.input}>
                {confirmButtonText ?? i18n.t('OK')}
            </Button>
        ),
        showDenyButton && (
            <Button key="deny" type="button" variant="secondary" className="min-w-16" onClick={deny}>
                {denyButtonText ?? i18n.t('No')}
            </Button>
        ),
        showCancelButton && (
            <Button key="cancel" type="button" variant="outline" className="min-w-16" autoFocus={focusCancel} onClick={dismiss}>
                {cancelButtonText ?? i18n.t('Cancel')}
            </Button>
        ),
    ].filter(Boolean);

    return (
        <Dialog open onOpenChange={(open) => !open && dismiss()}>
            <DialogContent
                className={classNames("p-0 max-w-md gap-0", className)}
                noClose={!showCloseButton}
                modal={!allowOutsideClick}
                onEscapeKeyDown={allowEscapeKey ? undefined : (e) => e.preventDefault()}
            >
                <form onSubmit={confirm}>
                    <DialogHeader className={classNames("px-4 pt-4 text-left", !title && "sr-only")}>
                        <DialogTitle className="text-sm flex items-center gap-2">
                            {icon && <FireDialogIcon icon={icon} />}
                            {title ?? i18n.t('Notice')}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="px-4 py-3 text-xs flex flex-col gap-3">
                        {!title && icon && <FireDialogIcon icon={icon} />}
                        {text && (
                            <DialogDescription className="whitespace-pre-wrap text-xs text-foreground/90">
                                {text}
                            </DialogDescription>
                        )}
                        {!text && <DialogDescription className="sr-only">{i18n.t('Dialog')}</DialogDescription>}
                        {html}
                        {options.input && <FireDialogInput options={options} input={input} />}
                    </div>

                    {buttons.length > 0 && (
                        <DialogFooter className="mx-0 mb-0 px-4 py-3 flex-row justify-end">
                            {reverseButtons ? buttons.reverse() : buttons}
                        </DialogFooter>
                    )}
                </form>
            </DialogContent>
        </Dialog>
    );
}

function FireDialogInput({ options, input }: { options: FireDialogOptions; input: FireDialogInputState; }) {
    const snap = useSnapshot(input, { sync: true });
    const { inputPlaceholder, inputOptions = {}, inputAttributes, inputLabel } = options;

    function setValue(value: string) {
        input.value = value;
        input.error = undefined;
    }

    return (
        <div className="flex flex-col gap-2">
            {inputLabel && options.input !== 'checkbox' && <Label className="text-xs">{inputLabel}</Label>}

            {(options.input === 'text' || options.input === 'number') && (
                <Input
                    type={options.input}
                    value={snap.value}
                    placeholder={inputPlaceholder}
                    onChange={(e) => setValue(e.target.value)}
                    autoFocus
                    {...inputAttributes}
                />
            )}

            {options.input === 'textarea' && (
                <Textarea
                    className="min-h-32 text-xs font-mono"
                    value={snap.value}
                    placeholder={inputPlaceholder}
                    onChange={(e) => setValue(e.target.value)}
                    autoFocus
                    {...inputAttributes}
                />
            )}

            {options.input === 'radio' && (
                <RadioGroup value={snap.value} onValueChange={setValue}>
                    {Object.entries(inputOptions).map(([key, label]) => (
                        <Label key={key} className="text-xs font-normal flex items-center gap-2">
                            <RadioGroupItem value={key} />
                            {label}
                        </Label>
                    ))}
                </RadioGroup>
            )}

            {options.input === 'select' && (
                <Select value={snap.value} onValueChange={setValue}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder={inputPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(inputOptions).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {options.input === 'checkbox' && (
                <Label className="text-xs font-normal flex items-center gap-2">
                    <Checkbox checked={snap.checked} onCheckedChange={(v) => { input.checked = v === true; }} />
                    {inputLabel}
                </Label>
            )}

            {snap.error && (
                <div className="text-xs text-destructive">{snap.error}</div>
            )}
        </div>
    );
}

function FireDialogIcon({ icon }: { icon: DialogIcon; }) {
    switch (icon) {
        case 'info': return <InfoIcon className="shrink-0 size-4 text-blue-500" />;
        case 'warning': return <TriangleAlertIcon className="shrink-0 size-4 text-amber-500" />;
        case 'error': return <CircleAlertIcon className="shrink-0 size-4 text-red-500" />;
        case 'success': return <CircleCheckIcon className="shrink-0 size-4 text-green-500" />;
        case 'question': return <CircleHelpIcon className="shrink-0 size-4 text-muted-foreground" />;
    }
}
