import * as React from "react"
import { cn } from "@/utils/classnames"
import { Separator as SeparatorPrimitive } from "radix-ui"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "data-vertical:self-stretch shrink-0 data-horizontal:h-px data-horizontal:w-full data-vertical:w-px bg-border",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
