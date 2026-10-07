import i18n from "i18next";
import { fireDialog } from "../7-0-dialogs/dialogs";

export async function askForPlaybackRate({ detectedFps, outputPlaybackRate }: { detectedFps: number | undefined; outputPlaybackRate: number; }) {
    const fps = detectedFps || 1;
    const currentFps = fps * outputPlaybackRate;

    function parseValue(v: string) {
        if (v.trim() === '') return 1;
        const newFps = parseFloat(v);
        return Number.isNaN(newFps) ? undefined : newFps / fps;
    }

    const { value, isConfirmed } = await fireDialog({
        title: i18n.t('Change FPS'),
        input: 'text',
        inputValue: currentFps.toFixed(5),
        text: i18n.t('This option lets you losslessly change the speed at which media players will play back the exported file. For example if you double the FPS, the playback speed will double (and duration will halve), however all the frames will be intact and played back (but faster). Be careful not to set it too high, as the player might not be able to keep up (playback CPU usage will increase proportionally to the speed!)'),
        showCancelButton: true,
        inputValidator: (v) => (parseValue(v) != null ? null : i18n.t('Please enter a valid number.')),
    });
    if (!isConfirmed || value == null) return undefined;
    return parseValue(value);
}
