import { atom } from "jotai";
import { proxy } from "valtio";
import { animate, cancelFrame, frame, motionValue, type FrameData } from "motion/react";

/**
 * Look of the morphing outline. Read on every frame, so edits (from code, settings UI, or devtools) apply immediately.
 *
 * This module is separate from the button component so a reload of that file does not recreate the
 * proxy, the atoms, or the clock. A new clock would freeze the outline or jump it back to the start.
 */
export const blobButtonConfig = proxy({
    samples: 48,            // points the outline is drawn through (8..96); more is smoother, it does not add lumps
    squareness: 2.6,        // superellipse exponent of the base shape: 2 is an ellipse, 4 is close to a rounded rectangle
    wobble: 0.24,           // largest lump height, as a fraction of the half-height
    dent: 0.3,              // how deep inward dents may go, relative to outward lumps; low keeps the shape from pinching into a worm
    endWobble: 0.6,         // lump multiplier on the left and right ends, which curve too tightly to take full lumps without kinking
    speed: 1,               // morph speed at rest
    activeWobble: 1.2,      // wobble multiplier while hovered
    activeSpeed: 2,         // speed multiplier while hovered
    ghostLag: 1.5,          // how far ahead in morph time the faint second outline runs
});

/** True while the pointer is over the button. Shared, so the Welcome page piece copies show the same state. */
export const blobButtonActiveAtom = atom(false);

//---------------------------------------------------------------------------

/**
 * Morph time and activity are module-level and the wave seeds are deterministic: every instance
 * (the live button and its inert copies in the Welcome page pieces) must draw the identical outline,
 * or the seams between the pieces would show during the view transition.
 */
export const morphTime = motionValue(0);
export const activity = motionValue(0);    // 0 at rest, 1 hovered

export const setBlobButtonActiveAtom = atom(null,
    (get, set, active: boolean) => {
        if (get(blobButtonActiveAtom) === active) {
            return;
        }
        set(blobButtonActiveAtom, active);
        animate(activity, active ? 1 : 0, { type: "spring", visualDuration: 0.7, bounce: 0 });
    }
);

//---------------------------------------------------------------------------

let clockUsers = 0;

function tickClock({ delta }: FrameData) {
    const { speed, activeSpeed } = blobButtonConfig;
    const seconds = Math.min(delta, 50) / 1000; // a backgrounded tab must not jump the shape
    morphTime.set(morphTime.get() + seconds * speed * (1 + (activeSpeed - 1) * activity.get()));
}

/** Subscribe one component to the shared morph clock. The returned function releases that subscription. */
export function acquireMorphClock() {
    if (clockUsers++ === 0) {
        frame.update(tickClock, true);
    }
    return () => {
        if (--clockUsers === 0) {
            cancelFrame(tickClock);
        }
    };
}
