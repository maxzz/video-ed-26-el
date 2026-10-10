import { type HTMLAttributes } from "react";
import { classNames } from "@/utils";

export function Icon_ToFrame({ className, title, ...rest }: HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current stroke-[1.5px]", className)} strokeLinecap="round" viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <path d="M17.445 5.239 L11.573 11.112 A0.923 0.923 0 0 0 11.573 12.416 L17.445 18.289" />
            <line x1="7.879" y1="4.918" x2="8.17" y2="19.081" />
        </svg>
    );
}
