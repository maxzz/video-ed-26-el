import i18n from 'i18next';
import { userSettings } from '../9-state/user-settings.ts';
import { showNotification } from '../8-lib/notifications.ts';
import { toast } from '../8-lib/toast.tsx';

// Settings toggles used from several places (bottom bar, top menu, settings dialog, keyboard)

export function toggleInvertCutSegments() {
    const newVal = !userSettings.invertCutSegments;
    userSettings.invertCutSegments = newVal;
    toast.fire({
        title: newVal
            ? i18n.t('When you export, selected segments on the timeline will be REMOVED - the surrounding areas will be KEPT')
            : i18n.t('When you export, selected segments on the timeline will be KEPT - the surrounding areas will be REMOVED.'),
    });
}

export function toggleSimpleMode() {
    const v = userSettings.simpleMode;
    showNotification({ text: v ? i18n.t('Advanced view has been enabled. You will now also see non-essential buttons and functions') : i18n.t('Advanced view disabled. You will now see only the most essential buttons and functions') });
    userSettings.simpleMode = !v;
}

export function toggleExportConfirmEnabled() {
    const newVal = !userSettings.exportConfirmEnabled;
    showNotification({ text: newVal ? i18n.t('Export options will be shown before exporting.') : i18n.t('Export options will not be shown before exporting.') });
    userSettings.exportConfirmEnabled = newVal;
}
