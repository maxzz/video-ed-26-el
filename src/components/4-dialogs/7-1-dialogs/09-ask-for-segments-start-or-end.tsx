import i18n from 'i18next';
import { fireDialog } from '../7-0-dialogs/dialogs.ts';

export async function askForSegmentsStartOrEnd(text: string) {
    const { value } = await fireDialog({
        input: 'radio',
        showCancelButton: true,
        inputOptions: { start: i18n.t('Start'), end: i18n.t('End'), both: i18n.t('Both') },
        inputValue: 'both',
        text,
    });
    if (!value) return undefined;
    return value === 'both' ? ['start', 'end'] as const : [value as 'start' | 'end'] as const;
}
