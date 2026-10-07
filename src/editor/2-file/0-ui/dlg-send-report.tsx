import { CopyIcon } from "lucide-react";
import { toast } from "@/components/4-dialogs/7-0-dialogs/toast";
import { Button } from "@/ui/shadcn/button";
import i18n from "i18next";

import { fireDialog } from "@/components/4-dialogs/7-0-dialogs/dialogs";
import { discussionsUrl, githubUrl, publicBugReportUrl } from "@shared/constants";
import { getAppInfo, mainApi } from "@/editor/0-core/7-actions/0-main-api";
import { isExecaError } from "@/editor/0-core/8-lib/util";

/** Port of upstream reporting.tsx openSendReportDialog */
export function dialog_SendReport_open({ err, message, state }: { err?: unknown; message?: string | undefined; state?: unknown; } = {}) {
    const text = getReportText({ err, message, state });

    async function copyText() {
        await mainApi.writeClipboardText(text);
        toast.fire({ icon: 'success', timer: 2000, text: i18n.t('Copied to clipboard') });
    }

    fireDialog({
        title: i18n.t('Send problem report'),
        showCloseButton: true,
        showConfirmButton: false,
        className: 'max-w-2xl',
        html: (
            <div className="max-h-96 text-xs text-left overflow-y-auto flex flex-col gap-2">
                <p>
                    If you're having a problem or question about LosslessCut, please first check the links in the <b>Help</b> menu.
                    {' '}If you cannot find any resolution, you may ask a question in <ExternalLink url={discussionsUrl}>GitHub discussions</ExternalLink>.
                </p>
                <p>
                    If you believe that you found a bug in LosslessCut, you may <ExternalLink url={publicBugReportUrl}>report a bug</ExternalLink> (<ExternalLink url={githubUrl}>GitHub</ExternalLink>).
                </p>

                <div className="flex items-center gap-2">
                    {i18n.t('Include the following text:')}
                    <Button variant="outline" size="sm" onClick={copyText}>
                        <CopyIcon /> {i18n.t('Copy to clipboard')}
                    </Button>
                </div>

                <p className="text-muted-foreground">{i18n.t('You might want to redact any sensitive information like paths.')}</p>

                <div className="p-1 text-xs font-mono font-semibold text-muted-foreground bg-muted select-text whitespace-pre-wrap">
                    {text}
                </div>
            </div>
        ),
    });
}

function ExternalLink({ url, children }: { url: string; children: string; }) {
    return (
        <button type="button" className="text-primary hover:underline cursor-pointer" onClick={() => mainApi.openExternal(url)}>
            {children}
        </button>
    );
}

function getReportText({ err, message, state }: { err?: unknown; message?: string | undefined; state?: unknown; }) {
    let appInfo: ReturnType<typeof getAppInfo> | undefined;
    try {
        appInfo = getAppInfo();
    } catch {
        appInfo = undefined;
    }

    const jsonReport = JSON.stringify({
        err: isExecaError(err) && {
            code: err.code,
            isTerminated: err.isTerminated,
            failed: err.failed,
            timedOut: err.timedOut,
            isCanceled: err.isCanceled,
            exitCode: err.exitCode,
        },
        state,
        platform: appInfo?.platform,
        arch: appInfo?.arch,
        version: appInfo?.version,
    }, null, 2);

    return [
        ...(message != null ? [message] : []),
        getErrorText(err),
        '',
        'App state:',
        jsonReport,
    ].join('\n');
}

function getErrorText(err: unknown) {
    if (err == null) return 'No error occurred.';
    return err instanceof Error ? err.stack : String(err);
}
