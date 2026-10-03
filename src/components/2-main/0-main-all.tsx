import { TestConfirmationDialog, TestResizablePanels, TestLoginDialog } from "./xyz-demos";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/ui/shadcn/accordion";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";

export function MainBody() {
    const { expandedSections } = useSnapshot(appSettings);

    function handleValueChange(value: string[]) {
        appSettings.expandedSections = value;
    }

    return (
        <main className="px-2 py-3 flex flex-col gap-4">
            <Accordion 
                className="gap-4"
                value={expandedSections as string[]} 
                onValueChange={handleValueChange}
                type="multiple" 
            >
                {/* Section 1: Resizable Panels */}
                <AccordionItem value="resizable-panels" className="bg-card border rounded-xl shadow-xs overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline border-b">
                        Resizable Panels Demo
                    </AccordionTrigger>

                    <AccordionContent className="p-0">
                        <TestResizablePanels className="w-full h-100 overflow-hidden" />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            {/* Dialog Buttons */}
            <div className="flex gap-2">
                <TestConfirmationDialog />
                <TestLoginDialog />
            </div>
        </main>
    );
}
