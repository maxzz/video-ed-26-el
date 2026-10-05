import i18n from 'i18next';
import { formatDuration } from '../../../editor/0-core/8-lib/duration.ts';
import type { ParseTimecode } from '../../../editor/0-core/8-lib/9-types-core.ts';
import { fireDialog } from '../7-0-dialogs/dialogs.ts';
import { maxSegments } from './06-ask-for-num-segments.tsx';

export async function askForSegmentDuration({ totalDuration, inputPlaceholder, parseTimecode }: {
    totalDuration: number;
    inputPlaceholder: string;
    parseTimecode: ParseTimecode;
}) {
    const { value } = await fireDialog({
        input: 'text',
        showCancelButton: true,
        inputValue: inputPlaceholder,
        text: i18n.t('Divide timeline into a number of segments with the specified length'),
        inputValidator: (v) => {
            const segmentDuration = parseTimecode(v);
            if (segmentDuration != null) {
                const numSegments = Math.ceil(totalDuration / segmentDuration);
                if (segmentDuration > 0 && numSegments <= maxSegments) {
                    if (segmentDuration < totalDuration) return null;
                    return i18n.t('Value must be shorter than total duration ({{totalDuration}})', { totalDuration: formatDuration({ seconds: totalDuration, shorten: true }) });
                }
            }
            return i18n.t('Please input a valid duration. Example: {{example}}', { example: inputPlaceholder });
        },
    });
    if (value == null) return undefined;
    return parseTimecode(value);
}
