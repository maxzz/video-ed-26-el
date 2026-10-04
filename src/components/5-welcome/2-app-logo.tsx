import { type HTMLAttributes, ViewTransition } from "react";
import { classNames } from "@/utils";
import { Icon_VideoFrameCut } from "@/ui/icons/normal/local-ui/01-video-frame-cut";
import { APP_NAME } from "./a-ui-app-page";

/**
 * App logo. The same component is rendered on the Welcome page (large)
 * and in the main page header (small); the shared `name` makes React morph one into the other.
 * Only one mounted page may render it at a time: duplicate view-transition names abort the transition.
 */
export function AppLogo(props: HTMLAttributes<SVGSVGElement>) {
    return (
        <ViewTransition name={APP_LOGO_VT_NAME} share="vt-logo-share">
            <AppLogoImage {...props} />
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
