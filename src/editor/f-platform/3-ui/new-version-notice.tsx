import { useTranslation } from 'react-i18next';
import { mainApi } from '@/editor/0-core/2-lib/main-api.ts';
import { toast } from '@/editor/0-core/2-lib/toast.tsx';
import { getAppReleaseUrl } from '../2-lib/versions.ts';

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
