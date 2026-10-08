import { type ReactNode } from "react";
import { notice } from "@/ui/local-ui/7-toaster";
import i18n from "i18next";

import { type DialogIcon } from "./1-dialogs";

interface ToastOptions {
    icon?: DialogIcon;
    title?: ReactNode;
    text?: ReactNode;
    /** milliseconds */
    timer?: number;
}

/** SweetAlert-like toast API used by the ported LosslessCut code */
export const toast = {
    fire({ icon = 'info', title, text, timer }: ToastOptions) {
        
        const message = title && text
            ? <div><div className="font-semibold">{title}</div><div>{text}</div></div>
            : (title ?? text);

        const options = timer != null ? { duration: timer } : {};

        switch (icon) {
            case 'error': return notice.error(message, options);
            case 'warning': return notice.warning(message, options);
            case 'success': return notice.success(message, options);
            default: return notice.info(message, options);
        }
    },
};

export function toastError(err: unknown) {
    console.error('toastError', err);
    
    const text = err instanceof Error ? err.message : String(err);
    toast.fire({ icon: 'error', title: i18n.t('Error'), text: text.slice(0, 300) });
}
