import { appName } from '@shared/constants';
import { jotaiDefaultStore } from '@/utils/local-utils/9-jotai-default-store';
import { hideAllNotificationsAtom, userSettings } from '@/editor/0-core/9-state/user-settings.ts';
import { isLinux, mainApi } from '@/editor/0-core/7-actions/0-main-api';
import { toast } from '@/components/4-dialogs/7-0-dialogs/toast';

export function showNotification(opts: Parameters<typeof toast.fire>[0]) {
    if (!jotaiDefaultStore.get(hideAllNotificationsAtom)) toast.fire(opts);
}

export function showOsNotification(text: string) {
    if (userSettings.hideOsNotifications != null) return;
    // on Linux app name is not shown in notification, see https://github.com/mifi/lossless-cut/issues/2794
    if (isLinux) mainApi.sendOsNotification({ title: appName, body: text });
    else mainApi.sendOsNotification({ title: text });
}
