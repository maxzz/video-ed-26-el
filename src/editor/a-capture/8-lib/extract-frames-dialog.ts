import i18n from 'i18next';
import { fireDialog } from '@/editor/0-core/0-state/dialogs.ts';

// Port of upstream dialogs/extractFrames.tsx

type CaptureChoice = 'thumbnailFilter' | 'selectNthSec' | 'selectNthFrame' | 'selectScene' | 'everyFrame';

async function askValue({ text, inputLabel, inputValue, input = 'text' }: { text: string; inputLabel: string; inputValue: string; input?: 'text' | 'number'; }) {
    const { value } = await fireDialog({ text, icon: 'question', input, inputLabel, inputValue, showCancelButton: true });
    return value;
}

export async function askExtractFramesAsImages({ segmentsNumFrames, plural, fps }: { segmentsNumFrames: number; plural: boolean; fps: number; }) {
    const { value: captureChoice } = await fireDialog<CaptureChoice>({
        text: i18n.t(plural ? 'Extract frames of the selected segments as images' : 'Extract frames of the current segment as images'),
        icon: 'question',
        input: 'radio',
        inputValue: 'thumbnailFilter',
        showCancelButton: true,
        className: 'max-w-lg',
        inputOptions: {
            thumbnailFilter: i18n.t('Capture the best image every nth second'),
            selectNthSec: i18n.t('Capture exactly one image every nth second'),
            selectNthFrame: i18n.t('Capture exactly one image every nth frame'),
            selectScene: i18n.t('Capture frames that differ the most from the previous frame'),
            everyFrame: i18n.t('Capture every single frame as an image'),
        } satisfies Record<CaptureChoice, string>,
    });

    if (!captureChoice) return undefined;

    let filter: string | undefined;
    let estimatedMaxNumFiles = segmentsNumFrames;

    if (captureChoice === 'thumbnailFilter') {
        const value = await askValue({
            text: i18n.t('Capture the best image every nth second'),
            inputLabel: i18n.t('Enter the max number of seconds between each image (decimal)'),
            inputValue: '5',
        });
        if (value == null) return undefined;
        const intervalFrames = Math.round(parseFloat(value) * fps);
        if (Number.isNaN(intervalFrames) || intervalFrames < 1 || intervalFrames > 1000) return undefined; // a too large value uses a lot of memory

        filter = `thumbnail=${intervalFrames}`;
        estimatedMaxNumFiles = Math.round(segmentsNumFrames / intervalFrames);
    }

    if (captureChoice === 'selectNthSec' || captureChoice === 'selectNthFrame') {
        let nthFrame: number;
        if (captureChoice === 'selectNthFrame') {
            const value = await askValue({
                text: i18n.t('Capture exactly one image every nth frame'),
                inputLabel: i18n.t('Enter the number of frames between each image (integer)'),
                inputValue: '30',
                input: 'number',
            });
            if (value == null) return undefined;
            const intervalFrames = parseInt(value, 10);
            if (Number.isNaN(intervalFrames) || intervalFrames < 1) return undefined;
            nthFrame = intervalFrames;
        } else {
            const value = await askValue({
                text: i18n.t('Capture exactly one image every nth second'),
                inputLabel: i18n.t('Enter the number of seconds between each image (decimal)'),
                inputValue: '5',
            });
            if (value == null) return undefined;
            const intervalFrames = Math.round(parseFloat(value) * fps);
            if (Number.isNaN(intervalFrames) || intervalFrames < 1) return undefined;
            nthFrame = intervalFrames;
        }

        filter = `select=not(mod(n\\,${nthFrame}))`;
        estimatedMaxNumFiles = Math.round(segmentsNumFrames / nthFrame);
    }

    if (captureChoice === 'selectScene') {
        const value = await askValue({
            text: i18n.t('Capture frames that differ the most from the previous frame'),
            inputLabel: i18n.t('Enter a decimal number between 0 and 1 (sane values are 0.3 - 0.5)'),
            inputValue: '0.4',
        });
        if (value == null) return undefined;
        const minSceneChange = parseFloat(value);
        if (Number.isNaN(minSceneChange) || minSceneChange <= 0 || minSceneChange >= 1) return undefined;

        filter = `select=gt(scene\\,${minSceneChange})`;
        // we don't know estimatedMaxNumFiles here
    }
    // else everyFrame

    estimatedMaxNumFiles += 1; // just to be sure

    if (estimatedMaxNumFiles > 1000) {
        const { isConfirmed } = await fireDialog({
            icon: 'warning',
            text: i18n.t('Note that depending on input parameters, up to {{estimatedMaxNumFiles}} files may be produced!', { estimatedMaxNumFiles }),
            showCancelButton: true,
            confirmButtonText: i18n.t('Confirm'),
        });
        if (!isConfirmed) return undefined;
    }

    return { filter, estimatedMaxNumFiles };
}
