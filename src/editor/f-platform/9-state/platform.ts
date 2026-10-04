import { atom } from 'jotai';
import type { MifiLink } from '../8-lib/versions.ts';

/** Newer release found by the main process update check */
export const newVersionAtom = atom<string | undefined>(undefined);

/** Upstream's remote "no file loaded" link (only fetched when networking is enabled) */
export const mifiLinkAtom = atom<MifiLink | undefined>(undefined);
