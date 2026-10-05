import type { FormEvent, ReactNode } from 'react';
import { proxy, useSnapshot } from 'valtio';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/shadcn/dialog';
import { openCustomDialog } from '../../../components/4-dialogs/7-0-dialogs/dialogs.ts';

export interface ExpressionDialogOptions {
    /** Return `{ error }` to keep the dialog open, undefined on success */
    onSubmit: (value: string) => Promise<{ error: string; } | undefined>;
    examples: { name: string; code: string; }[];
    title: ReactNode;
    description?: ReactNode;
    variables?: string[];
    inputValue?: string | undefined;
    confirmButtonText?: ReactNode;
}

/** JavaScript expression prompt (upstream ExpressionDialog). Resolves true when submitted successfully */
export function openExpressionDialog(options: ExpressionDialogOptions) {
    const state = proxy({ value: options.inputValue ?? '', error: undefined as string | undefined, busy: false });
    return openCustomDialog<boolean>((close) => <ExpressionDialogContent options={options} state={state} close={close} />);
}

function ExpressionDialogContent({ options, state, close }: {
    options: ExpressionDialogOptions;
    state: { value: string; error: string | undefined; busy: boolean; };
    close: (value?: boolean) => void;
}) {
    const { t } = useTranslation();
    const snap = useSnapshot(state, { sync: true });
    const { title, description, variables, examples, confirmButtonText } = options;

    async function submit(e: FormEvent) {
        e.preventDefault();
        state.busy = true;
        try {
            const resp = await options.onSubmit(state.value);
            state.error = resp?.error;
            if (resp == null) close(true);
        } finally {
            state.busy = false;
        }
    }

    return (
        <DialogContent className="sm:max-w-[80vw]">
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                {description && <DialogDescription asChild><div>{description}</div></DialogDescription>}
            </DialogHeader>

            {variables && (
                <div className="text-sm flex flex-wrap items-center gap-1">
                    {t('Variables')}:
                    {variables.map((v) => <code key={v} className="px-1 text-xs font-mono bg-muted rounded">{v}</code>)}
                </div>
            )}

            <div className="text-sm flex flex-col items-start gap-0.5">
                <b>{t('Examples')}:</b>
                {examples.map(({ name, code }) => (
                    <button key={code} type="button" className="text-primary hover:underline" onClick={() => { state.value = code; }}>
                        {name}
                    </button>
                ))}
            </div>

            <form className="flex flex-col gap-3" onSubmit={submit}>
                <Input
                    className="h-11 font-mono"
                    autoFocus
                    placeholder={t('Enter JavaScript expression')}
                    value={snap.value}
                    onChange={(e) => { state.value = e.target.value; }}
                />

                {snap.error != null && <div className="text-sm font-bold text-destructive">{snap.error}</div>}

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => close(false)}>{t('Cancel')}</Button>
                    <Button type="submit" disabled={snap.busy}>{confirmButtonText ?? t('Confirm')}</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
