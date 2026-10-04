import { Toaster } from '@/ui/shadcn/sonner';
import { TooltipProvider } from '@/ui/shadcn/tooltip';
import { AllDialogs } from './1-globals';
import { AppPages } from '../5-welcome';
import { Header } from '../1-header';
import { MainBody } from '../2-main';

export function App() {
    return (
        <TooltipProvider delayDuration={400}>
            <Toaster />
            <AllDialogs />

            <AppPages>
                <div className="h-screen text-xs bg-background overflow-hidden grid grid-rows-[auto_1fr]">
                    <Header />
                    <MainBody />
                </div>
            </AppPages>
        </TooltipProvider>
    );
}
