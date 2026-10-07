import { useSnapshot } from "valtio";
import { classNames } from "@/utils";
import { appSettings } from "@/store/1-ui-settings";
import { Toaster } from "@/ui/shadcn/sonner";
import { TooltipProvider } from "@/ui/shadcn/tooltip";
import { AllDialogs } from "./1-globals";
import { AppPages } from "../5-welcome";
import { Header } from "../1-header";
import { MainBody } from "../2-main";
import { StatusBar } from "../6-status-bar";

export function App() {
    const { showStatusBar } = useSnapshot(appSettings);
    return (
        <TooltipProvider delayDuration={400}>
            <Toaster />
            <AllDialogs />

            <AppPages>
                <div className={classNames("h-screen text-xs bg-background overflow-hidden grid", showStatusBar ? "grid-rows-[auto_1fr_auto]" : "grid-rows-[auto_1fr]")}>
                    <Header />
                    <MainBody />
                    {showStatusBar && <StatusBar />}
                </div>
            </AppPages>
        </TooltipProvider>
    );
}
