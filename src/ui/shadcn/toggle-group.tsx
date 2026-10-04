import { type ComponentProps, createContext, useContext } from "react";
import { type VariantProps } from "class-variance-authority";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cn } from "@/utils/classnames";
import { toggleVariants } from "@/ui/shadcn/toggle";

const ToggleGroupContext = createContext<VariantProps<typeof toggleVariants>>({ size: "default", variant: "default" });

export function ToggleGroup({ className, variant, size, children, ...rest }: ComponentProps<typeof ToggleGroupPrimitive.Root> & VariantProps<typeof toggleVariants>) {
    return (
        <ToggleGroupPrimitive.Root
            data-slot="toggle-group"
            data-variant={variant}
            data-size={size}
            className={cn("group/toggle-group w-fit data-[variant=outline]:shadow-xs rounded-lg flex items-center", className)}
            {...rest}
        >
            <ToggleGroupContext.Provider value={{ variant, size }}>
                {children}
            </ToggleGroupContext.Provider>
        </ToggleGroupPrimitive.Root>
    );
}

export function ToggleGroupItem({ className, children, variant, size, ...rest }: ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>) {
    const context = useContext(ToggleGroupContext);
    return (
        <ToggleGroupPrimitive.Item
            data-slot="toggle-group-item"
            data-variant={context.variant || variant}
            data-size={context.size || size}
            className={cn(
                toggleVariants({ variant: context.variant || variant, size: context.size || size }),
                "min-w-0 shrink-0 rounded-none shadow-none first:rounded-l-lg last:rounded-r-lg focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l",
                className,
            )}
            {...rest}
        >
            {children}
        </ToggleGroupPrimitive.Item>
    );
}
