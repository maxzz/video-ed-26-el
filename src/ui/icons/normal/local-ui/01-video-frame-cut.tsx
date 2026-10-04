import { type HTMLAttributes } from "react"; //https://icones.js.org/collection/all?s=video&icon=solar:video-frame-cut-2-line-duotone
import { classNames } from "@/utils";

export function Icon_VideoFrameCut({ className, title, ...rest }: HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current stroke-[1.5]", className)} strokeLinecap="round" viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <path d="M8.5 4H8c-2.828 0-4.243 0-5.121.879C2 5.757 2 7.172 2 10v4c0 2.828 0 4.243.879 5.121C3.757 20 5.172 20 8 20h.5m7-16h.5c2.828 0 4.243 0 5.121.879C22 5.757 22 7.172 22 10v4c0 2.828 0 4.243-.879 5.121C20.243 20 18.828 20 16 20h-.5" />
            <path className="opacity-50" d="M17 4v16M7 4v16M2.5 9H7m10 0h4.5m-19 6H7m10 0h4.5M13.138 2h-2.276a.5.5 0 0 0-.434.748l1.138 1.992a.5.5 0 0 0 .868 0l1.139-1.992A.5.5 0 0 0 13.138 2Zm0 20h-2.276a.5.5 0 0 1-.434-.748l1.138-1.992a.5.5 0 0 1 .868 0l1.139 1.992a.5.5 0 0 1-.435.748Z" />
            <path d="M12 11.5v1m0-5v1m0 7v1" />
        </svg>
    );
}
//solar-video-frame-cut-2-line-duotone
