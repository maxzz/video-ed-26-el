import { type HTMLAttributes } from "react";
import { classNames } from "@/utils";

/** Bottom bar on the main page. Content will show current editor status. */
export function StatusBar({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            role="status"
            aria-label="Status"
            className={classNames("px-3 h-6 text-xs text-foreground bg-background border-t border-border flex items-center", className)}
            {...rest}
        />
    );
}
