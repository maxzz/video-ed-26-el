import i18n from 'i18next';
import { Trans } from 'react-i18next';
import { fireDialog } from '../7-0-dialogs/dialogs.ts';

export const MovSuggestion = ({ fileFormat }: { fileFormat: string | undefined; }) => (fileFormat === 'mp4' ? <li><Trans>Change output <b>Format</b> from <b>MP4</b> to <b>MOV</b></Trans></li> : null);
export const OutputFormatSuggestion = () => <li><Trans>Select a different output <b>Format</b> (<b>matroska</b> and <b>mp4</b> support most codecs)</Trans></li>;
export const WorkingDirectorySuggestion = () => <li><Trans>Set a different <b>Working directory</b></Trans></li>;
export const DifferentFileSuggestion = () => <li><Trans>Try with a <b>Different file</b></Trans></li>;
export const HelpSuggestion = () => <li><Trans>See <b>Help</b></Trans> menu</li>;
export const ErrorReportSuggestion = () => <li><Trans>If nothing helps, you can send an <b>Error report</b></Trans></li>;

export async function showExportFailedDialog({ fileFormat, safeOutputFileName }: { fileFormat: string | undefined; safeOutputFileName: boolean; }) {
    const html = (
        <div className="text-left">
            <Trans>Try one of the following before exporting again:</Trans>
            <ol className="mt-2 pl-5 list-decimal">
                {!safeOutputFileName && <li><Trans>Output file names are not sanitized. Try to enable sanitazion or check your segment labels for invalid characters.</Trans></li>}
                <MovSuggestion fileFormat={fileFormat} />
                <OutputFormatSuggestion />
                <li><Trans>Disable unnecessary <b>Tracks</b></Trans></li>
                <li><Trans>Try both <b>Normal cut</b> and <b>Keyframe cut</b></Trans></li>
                <WorkingDirectorySuggestion />
                <DifferentFileSuggestion />
                <HelpSuggestion />
                <ErrorReportSuggestion />
            </ol>
        </div>
    );
    const { isConfirmed } = await fireDialog({ title: i18n.t('Unable to export this file'), icon: 'error', html, showCancelButton: true, cancelButtonText: i18n.t('OK'), confirmButtonText: i18n.t('Report'), focusCancel: true });
    return isConfirmed;
}
