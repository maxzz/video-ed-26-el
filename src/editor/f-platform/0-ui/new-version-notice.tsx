import { useTranslation } from "react-i18next";
import { mainApi } from "@/editor/0-core/7-actions/0-main-api";
import { toast } from "@/components/4-dialogs/7-0-dialogs/3-toast";
import { getAppReleaseUrl } from "../8-lib/versions";

export function showNewVersionNotice(version: string) {
    toast.fire({ icon: 'info', title: <NewVersionTitle />, text: <NewVersionLink version={version} />, timer: 15000 });
}

function NewVersionTitle() {
    const { t } = useTranslation();
    return <>{t('New version!')}</>;
}

function NewVersionLink({ version }: { version: string; }) {
    const { t } = useTranslation();
    return (
        <span className="underline cursor-pointer" role="button" onClick={() => mainApi.openExternal(getAppReleaseUrl(version))}>
            {t('Download {{version}}', { version })}
        </span>
    );
}
