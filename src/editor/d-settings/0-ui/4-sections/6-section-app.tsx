import { AppOptions } from "@/components/4-dialogs/8-3-options/1-app-options";

/** Template application options (theme, welcome page, status bar) */
export function Section_Application() {
    return (
        <div className="py-2 flex flex-col gap-3">
            <AppOptions />
        </div>
    );
}
