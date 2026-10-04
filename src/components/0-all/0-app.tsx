import { useSnapshot } from 'valtio';
import { Toaster } from '@/ui/shadcn/sonner';
import { TooltipProvider } from '@/ui/shadcn/tooltip';
import { appSettings } from '@/store/1-ui-settings';
import { AllDialogs } from './1-globals';
import { AppPages } from '../5-welcome';
import { Header } from '../1-header';
import { MainBody } from '../2-main';
import { Section3_Footer } from '../3-footer';

export function App() {
    const { showFooter } = useSnapshot(appSettings);
    return (
        <TooltipProvider delayDuration={400}>
            <Toaster />
            <AllDialogs />

            <AppPages>
                <div className="h-screen text-xs bg-background overflow-hidden grid grid-rows-[auto_1fr_auto]">
                    <Header />
                    <MainBody />
                    {showFooter ? <Section3_Footer className="h-6" /> : <div />}
                </div>
            </AppPages>
        </TooltipProvider>
    );
}
