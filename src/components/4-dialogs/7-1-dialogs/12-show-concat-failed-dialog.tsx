import i18n from "i18next";
import { Trans } from "react-i18next";
import { fireDialog } from "../7-0-dialogs/dialogs";
import { DifferentFileSuggestion, ErrorReportSuggestion, HelpSuggestion, MovSuggestion, OutputFormatSuggestion, WorkingDirectorySuggestion } from "./11-show-export-failed-dialog";

export async function showConcatFailedDialog({ fileFormat }: { fileFormat: string | undefined; }) {
    const html = (
        <div className="text-left">
            <Trans>Try each of the following before merging again:</Trans>
            <ol className="mt-2 pl-5 list-decimal">
                <MovSuggestion fileFormat={fileFormat} />
                <OutputFormatSuggestion />
                <li><Trans>Disable <b>merge options</b></Trans></li>
                <WorkingDirectorySuggestion />
                <DifferentFileSuggestion />
                <HelpSuggestion />
                <ErrorReportSuggestion />
            </ol>
        </div>
    );
    const { isConfirmed } = await fireDialog({ title: i18n.t('Unable to merge files'), icon: 'error', html, showCancelButton: true, cancelButtonText: i18n.t('OK'), confirmButtonText: i18n.t('Report'), focusCancel: true });
    return isConfirmed;
}
