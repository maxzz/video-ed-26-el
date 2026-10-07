import { type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/ui/shadcn/dialog";
import JSON5 from "json5";

// Port of upstream components/Json5Dialog.tsx

export function Dialog_Json5({ title, json, children }: { title: string; json: unknown; children: ReactNode; }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>

            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>
                        {title}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {title}
                    </DialogDescription>
                </DialogHeader>

                <pre className="select-text p-3 max-h-[50vh] text-xs font-mono bg-muted rounded-md overflow-auto">
                    {JSON5.stringify(json, null, 2)}
                </pre>
            </DialogContent>
        </Dialog>
    );
}
