import i18n from "i18next";
import { fire_Dialog } from "../7-0-dialogs/1-dialogs";

export async function askDialog_ForSegmentsStartOrEnd(text: string) {
    const { value } = await fire_Dialog({
        input: 'radio',
        showCancelButton: true,
        inputOptions: { start: i18n.t('Start'), end: i18n.t('End'), both: i18n.t('Both') },
        inputValue: 'both',
        text,
    });
    
    if (!value) {
        return undefined;
    }
    return value === 'both' ? ['start', 'end'] as const : [value as 'start' | 'end'] as const;
}
