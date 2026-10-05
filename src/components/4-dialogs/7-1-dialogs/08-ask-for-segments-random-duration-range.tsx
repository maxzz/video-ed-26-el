import i18n from 'i18next';
import { fireDialog } from '../7-0-dialogs/dialogs.ts';

// https://github.com/mifi/lossless-cut/issues/1153
export async function askForSegmentsRandomDurationRange() {
    function parse(str: string) {
        const match = str.replaceAll(/\s/g, '').match(/^duration([\d.]+)to([\d.]+),gap([-\d.]+)to([-\d.]+)$/i);
        if (!match) return undefined;
        const parsed = match.slice(1).map((val) => parseFloat(val));
        const durationMin = parsed[0]!;
        const durationMax = parsed[1]!;
        const gapMin = parsed[2]!;
        const gapMax = parsed[3]!;
        if (!(parsed.every((val) => !Number.isNaN(val)) && durationMin <= durationMax && gapMin <= gapMax && durationMin > 0)) return undefined;
        return { durationMin, durationMax, gapMin, gapMax };
    }

    const { value } = await fireDialog({
        input: 'text',
        showCancelButton: true,
        inputValue: 'Duration 3 to 5, Gap 0 to 2',
        text: i18n.t('Divide timeline into segments with randomized durations and gaps between segments, in a range specified in seconds with the correct format.'),
        inputValidator: (v) => (parse(v) ? null : i18n.t('Invalid input')),
    });
    if (value == null) return undefined;
    return parse(value);
}
