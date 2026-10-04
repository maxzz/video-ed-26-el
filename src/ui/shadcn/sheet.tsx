import { type ComponentProps } from "react";
import { XIcon } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { cn } from "@/utils/classnames";

export function Sheet({ ...rest }: ComponentProps<typeof SheetPrimitive.Root>) {
    return <SheetPrimitive.Root data-slot="sheet" {...rest} />;
}

export function SheetTrigger({ ...rest }: ComponentProps<typeof SheetPrimitive.Trigger>) {
    return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...rest} />;
}

export function SheetClose({ ...rest }: ComponentProps<typeof SheetPrimitive.Close>) {
    return <SheetPrimitive.Close data-slot="sheet-close" {...rest} />;
}

function SheetPortal({ ...rest }: ComponentProps<typeof SheetPrimitive.Portal>) {
    return <SheetPrimitive.Portal data-slot="sheet-portal" {...rest} />;
}

function SheetOverlay({ className, ...rest }: ComponentProps<typeof SheetPrimitive.Overlay>) {
    return (
        <SheetPrimitive.Overlay
            data-slot="sheet-overlay"
            className={cn("fixed inset-0 bg-black/30 data-open:fade-in-0 data-closed:fade-out-0 data-open:animate-in data-closed:animate-out z-50", className)}
            {...rest}
        />
    );
}

const sideClasses = {
    right: "inset-y-0 right-0 h-full w-3/4 sm:max-w-sm border-l data-open:slide-in-from-right data-closed:slide-out-to-right",
    left: "inset-y-0 left-0 h-full w-3/4 sm:max-w-sm border-r data-open:slide-in-from-left data-closed:slide-out-to-left",
    top: "inset-x-0 top-0 h-auto border-b data-open:slide-in-from-top data-closed:slide-out-to-top",
    bottom: "inset-x-0 bottom-0 h-auto border-t data-open:slide-in-from-bottom data-closed:slide-out-to-bottom",
};

export function SheetContent({ className, children, side = "right", noClose, ...rest }: ComponentProps<typeof SheetPrimitive.Content> & { side?: keyof typeof sideClasses; noClose?: boolean; }) {
    return (
        <SheetPortal>
            <SheetOverlay />
            <SheetPrimitive.Content
                data-slot="sheet-content"
                className={cn(
                    "fixed bg-background transition data-open:animate-in data-open:duration-300 data-closed:animate-out data-closed:duration-200 shadow-lg flex flex-col gap-4 z-50 ease-in-out",
                    sideClasses[side],
                    className,
                )}
                {...rest}
            >
                {children}
                {!noClose && (
                    <SheetPrimitive.Close className="absolute top-3 right-3 opacity-70 hover:opacity-100 focus:outline-hidden rounded">
                        <XIcon className="size-4" />
                        <span className="sr-only">Close</span>
                    </SheetPrimitive.Close>
                )}
            </SheetPrimitive.Content>
        </SheetPortal>
    );
}

export function SheetHeader({ className, ...rest }: ComponentProps<"div">) {
    return <div data-slot="sheet-header" className={cn("p-4 flex flex-col gap-1.5", className)} {...rest} />;
}

export function SheetFooter({ className, ...rest }: ComponentProps<"div">) {
    return <div data-slot="sheet-footer" className={cn("mt-auto p-4 flex flex-col gap-2", className)} {...rest} />;
}

export function SheetTitle({ className, ...rest }: ComponentProps<typeof SheetPrimitive.Title>) {
    return <SheetPrimitive.Title data-slot="sheet-title" className={cn("font-semibold text-foreground", className)} {...rest} />;
}

export function SheetDescription({ className, ...rest }: ComponentProps<typeof SheetPrimitive.Description>) {
    return <SheetPrimitive.Description data-slot="sheet-description" className={cn("text-sm text-muted-foreground", className)} {...rest} />;
}
