import { appName } from '@shared/constants';
import { appStore } from '@/editor/0-core/0-state/store.ts';
import { hideAllNotificationsAtom, userSettings } from '@/editor/0-core/0-state/user-settings.ts';
import { isLinux, mainApi } from '@/editor/0-core/2-lib/main-api.ts';
import { toast } from '@/editor/0-core/2-lib/toast.tsx';

export function showNotification(opts: Parameters<typeof toast.fire>[0]) {
    if (!appStore.get(hideAllNotificationsAtom)) toast.fire(opts);
}

export function showOsNotification(text: string) {
    if (userSettings.hideOsNotifications != null) return;
    // on Linux app name is not shown in notification, see https://github.com/mifi/lossless-cut/issues/2794
    if (isLinux) mainApi.sendOsNotification({ title: appName, body: text });
    else mainApi.sendOsNotification({ title: text });
}
