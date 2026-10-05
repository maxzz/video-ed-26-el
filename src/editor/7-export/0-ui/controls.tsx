import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useAnimate } from 'motion/react';
import { CircleHelpIcon, ClipboardIcon } from 'lucide-react';
import { mainApi } from '@/editor/0-core/7-actions/0-main-api';
import { toast } from '@/components/4-dialogs/7-0-dialogs/toast';
import type { DialogIcon } from '@/components/4-dialogs/7-0-dialogs/dialogs';
import { cn } from '@/utils/classnames';

export function showHelpText({ icon = 'info', timer = 10000, text }: { icon?: DialogIcon; timer?: number; text: string; }) {
    toast.fire({ icon, timer, text });
}

export function HelpIcon({ onClick, className, title }: { onClick: () => void; className?: string; title?: string; }) {
    return (
        <button type="button" title={title} className={cn('text-primary hover:text-primary/80 inline-flex items-center cursor-pointer', className)} onClick={(e) => { e.currentTarget.blur(); onClick(); }}>
            <CircleHelpIcon className="size-4" />
        </button>
    );
}

/** Upstream HighlightedText: a clickable value */
export function HighlightedText({ className, ...rest }: ComponentProps<'button'>) {
    return <button type="button" className={cn('px-1 text-left text-primary bg-primary/10 hover:bg-primary/20 rounded cursor-pointer', className)} {...rest} />;
}

export function CopyClipboardButton({ text, className, children }: { text: string; className?: string; children?: (p: { onClick: () => void; }) => ReactNode; }) {
    const { t } = useTranslation();
    const [scope, animate] = useAnimate();

    function onClick() {
        mainApi.writeClipboardText(text);
        animate(scope.current, { scale: [1, 1.5, 1] }, { duration: 0.2 });
    }

    return (
        <motion.span ref={scope} className={cn('inline-block cursor-pointer', className)}>
            {children != null
                ? children({ onClick })
                : <ClipboardIcon className="size-3.5" role="button" aria-label={t('Copy to clipboard')} onClick={onClick} />}
        </motion.span>
    );
}
