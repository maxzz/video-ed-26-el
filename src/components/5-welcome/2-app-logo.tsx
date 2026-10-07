import { type HTMLAttributes, ViewTransition } from "react";
import { classNames } from "@/utils";
import { Icon_VideoFrameCut } from "@/ui/icons/normal/local-ui/01-video-frame-cut";
import { APP_NAME } from "./a-ui-app-page";

/**
 * App logo. The same component is rendered on the Welcome page (large)
 * and in the main page header (small); the shared `name` makes React morph one into the other.
 * Only one mounted page may render it at a time: duplicate view-transition names abort the transition.
 *
 * The transition host is an HTML box, not the SVG. An inline SVG is `display: inline`, and React
 * rewrites that to `inline-block` while taking the snapshot, which blanks the icon for a frame
 * before the morph runs. The box also stacks above the Welcome piece copies: those cover the
 * page for a frame before the snapshot, and a hidden ancestor would hide the SVG with them.
 */
export function AppLogo({ className, iconClasses, ...rest }: HTMLAttributes<HTMLDivElement> & { iconClasses?: string }) {
    return (
        <ViewTransition name={APP_LOGO_VT_NAME} share="vt-logo-share">
            <div className={classNames("shrink-0 relative inline-block", className, "z-10")} {...rest}>
                <AppLogoImage className={classNames("block size-full", iconClasses)} />
            </div>
        </ViewTransition>
    );
}

const APP_LOGO_VT_NAME = "app-logo";

/** The logo artwork without a view transition, for decorative copies. */
export function AppLogoImage({ className, title = `${APP_NAME} logo`, ...rest }: HTMLAttributes<SVGSVGElement>) {
    return (
        <Icon_VideoFrameCut className={classNames("shrink-0 select-none", className)} title={title} role="img" {...rest} />
    );
}
