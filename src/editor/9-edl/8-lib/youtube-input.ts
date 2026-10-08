import i18n from "i18next";
import { fire_Dialog } from "@/components/4-dialogs/7-0-dialogs/1-dialogs";
import { parseYouTube } from "./edl-formats";

export async function askForYouTubeInput({ fileDuration }: { fileDuration?: number | undefined; }) {
    const example = i18n.t('YouTube video description\n00:00 Intro\n00:01 Chapter 2\n00:00:02.123 Chapter 3');
    const { value } = await fire_Dialog({
        title: i18n.t('Import text chapters / YouTube'),
        input: 'textarea',
        inputPlaceholder: example,
        text: i18n.t('Paste or type a YouTube chapters description or textual chapter description'),
        showCancelButton: true,
        inputValidator: (v) => {
            if (v) {
                const edl = parseYouTube(v);
                if (edl.length > 0) return null;
            }
            return i18n.t('Please input a valid format.');
        },
    });

    if (value == null) return [];

    const parsed = parseYouTube(value);

    // last segment shouldn't be a marker https://github.com/mifi/lossless-cut/discussions/2552
    return parsed.map((segment, i) => (
        i === parsed.length - 1 ? { ...segment, end: fileDuration } : segment
    ));
}
