import { type ComponentProps } from "react";
import { cn } from "@/utils/classnames";
import { Button } from "@/ui/shadcn/button";

export function Button_Bar({ className, ...rest }: ComponentProps<'button'>) {
    return (
        <Button
            className={cn('hover:bg-background hover:text-foreground rounded cursor-pointer', className)}
            variant="outline"
            size="icon-sm"
            type="button"
            {...rest}
        />
    );
}
