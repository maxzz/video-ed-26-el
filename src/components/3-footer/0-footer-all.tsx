import { type HTMLAttributes } from "react";
import { classNames, envBuildVersion, envModifiedDate } from "@/utils";
import { IconSunnyvale } from "@/ui/icons/normal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/shadcn/tooltip";

export function Section3_Footer({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={classNames("h-12 text-xs text-foreground bg-background border-t border-border flex items-center justify-center gap-2", className)} {...rest}>

            <a className={urlClasses} href="https://github.com/maxzz" target="_blank" rel="noopener">
                Created by Max Zakharzhevskiy
            </a>

            <Tooltip>
                <TooltipTrigger asChild>
                    <IconSunnyvale className="pt-1 size-6 hover:scale-150 transition-all origin-bottom duration-300" />
                </TooltipTrigger>
                <TooltipContent side="top">
                    <div className="flex flex-col gap-0.5">
                        <span>{envModifiedDate()}</span>
                        <span>Sunnyvale Produce</span>
                        <span>Version {envBuildVersion()}</span>
                    </div>
                </TooltipContent>
            </Tooltip>

            <a className={urlClasses} href="https://github.com/mifi/lossless-cut" target="_blank" rel="noopener">
                Based on LosslessCut (GPL-2.0)
            </a>
        </div>
    );
}

const urlClasses = "\
origin-center \
underline-offset-2 \
hover:underline \
hover:text-primary-500 \
transition-colors \
duration-1000 \
cursor-pointer";
