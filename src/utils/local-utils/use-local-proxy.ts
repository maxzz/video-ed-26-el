import { useRef } from "react";
import { proxy } from "valtio";

/** Valtio proxy for transient form state that lives as long as the component is mounted */
export function useLocalProxy<T extends object>(init: () => T): T {
    const ref = useRef<T>(null);
    ref.current ??= proxy(init());
    return ref.current;
}
