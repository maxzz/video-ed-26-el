import { getDefaultStore } from "jotai";

/**
 * The single Jotai store of the editor. Components use it implicitly (no Provider),
 * non-React code (IPC events, actions, ported upstream logic) reads and writes it directly.
 */
export const jotaiDefaultStore = getDefaultStore();
