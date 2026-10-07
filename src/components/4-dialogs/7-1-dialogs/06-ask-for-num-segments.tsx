import i18n from "i18next";
import { fireDialog } from "../7-0-dialogs/dialogs";

export const maxSegments = 1000;

export async function askForNumSegments() {
    const { value } = await fireDialog({
        input: 'number',
        inputAttributes: { min: String(0), max: String(maxSegments) },
        showCancelButton: true,
        inputValue: '2',
        text: i18n.t('Divide timeline into a number of equal length segments'),
        inputValidator: (v) => {
            const parsed = parseInt(v, 10);
            if (!Number.isNaN(parsed) && parsed >= 2 && parsed <= maxSegments) return null;
            return i18n.t('Please input a valid number of segments');
        },
    });
    if (value == null) return undefined;
    return parseInt(value, 10);
}
