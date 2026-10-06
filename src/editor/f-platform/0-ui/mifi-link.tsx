import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { mainApi } from "@/editor/0-core/7-actions/0-main-api";
import { classNames } from "@/utils";
import { mifiLinkAtom } from "../9-state/platform";

/** Port of the remote link iframe from upstream NoFileLoaded.tsx. Renders nothing until the link is loaded */
export function MifiLink({ darkMode, className }: { darkMode: boolean; className?: string; }) {
    const { t } = useTranslation();
    const mifiLink = useAtomValue(mifiLinkAtom);
    if (!mifiLink?.loadUrl) {
        return null;
    }

    const { loadUrl, targetUrl } = mifiLink;
    return (
        <div className={classNames("relative w-full h-20", className)}>
            <iframe
                className="absolute inset-0 size-full bg-transparent border-none pointer-events-none"
                style={{ colorScheme: 'initial' }}
                src={`${loadUrl}#dark=${darkMode ? 'true' : 'false'}`}
                title="iframe"
            />
            <div
                className="absolute inset-0 size-full cursor-pointer"
                title={t('Open link in browser')}
                role="button"
                onClick={(e) => {
                    e.stopPropagation();
                    if (targetUrl) mainApi.openExternal(targetUrl);
                }}
            />
        </div>
    );
}
