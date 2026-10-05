import { atom } from 'jotai';
import { proxy, snapshot, subscribe } from 'valtio';
import i18n from 'i18next';
import type { Config } from '@shared/types.ts';
import { defaultConfig } from '@shared/default-config.ts';
import { mainApi } from '../8-lib/main-api.ts';
import { appStore } from '../../../components/4-dialogs/7-0-dialogs/store.ts';

/**
 * User settings (electron-store `Config`). Mutate directly: `userSettings.keyframeCut = true`.
 * React: `useSnapshot(userSettings)`. Jotai derived atoms: `get(userSettingsAtom)`.
 */
export const userSettings = proxy<Config>(structuredClone(defaultConfig));

/** Immutable snapshot of userSettings, updated on every change, for use in Jotai derived atoms */
export const userSettingsAtom = atom<Readonly<Config>>(snapshot(userSettings) as Config);

const pendingKeys = new Set<keyof Config>();
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let loaded = false;

async function flush() {
    flushTimer = undefined;
    const keys = [...pendingKeys];
    pendingKeys.clear();
    for (const key of keys) {
        try {
            await mainApi.configSet(key, JSON.parse(JSON.stringify(userSettings[key] ?? null)));
        } catch (err) {
            console.error('Failed to set config', key, err);
            const { toastError } = await import('../8-lib/toast.tsx');
            toastError(i18n.t('Unable to save your preferences. Try to disable any anti-virus'));
        }
    }
}

subscribe(userSettings, (ops) => {
    appStore.set(userSettingsAtom, snapshot(userSettings) as Config);
    if (!loaded) return;
    for (const [, path] of ops) {
        const key = path[0];
        if (typeof key === 'string') pendingKeys.add(key as keyof Config);
    }
    flushTimer ??= setTimeout(flush, 300);
});

/** Must be awaited before the first render */
export async function loadUserSettings() {
    try {
        const all = await mainApi.configGetAll();
        Object.assign(userSettings, all);
    } catch (err) {
        console.error('Failed to load config', err);
    }
    appStore.set(userSettingsAtom, snapshot(userSettings) as Config);
    // let the initial assignment pass through valtio's batched notification before enabling persistence
    await Promise.resolve();
    loaded = true;
}

export async function resetUserSetting<K extends keyof Config>(key: K) {
    await mainApi.configReset(key);
    userSettings[key] = structuredClone(defaultConfig[key]);
}

// Derived values used throughout the app

export const customOutDirAtom = atom((get) => {
    const { enableCustomOutDir, recentCustomOutDirs } = get(userSettingsAtom);
    return enableCustomOutDir ? recentCustomOutDirs[0] : undefined;
});

export function setCustomOutDir(newDir: string | undefined) {
    if (newDir) {
        userSettings.recentCustomOutDirs = [newDir, ...userSettings.recentCustomOutDirs.filter((d) => d !== newDir)].slice(0, 5);
        userSettings.enableCustomOutDir = true;
    } else {
        userSettings.enableCustomOutDir = false;
    }
}

export const prefersReducedMotionAtom = atom((get) => {
    const { reducedMotion } = get(userSettingsAtom);
    if (reducedMotion !== 'user') return reducedMotion === 'always';
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
});

export const effectiveExportModeAtom = atom((get) => {
    const { segmentsToChaptersOnly, autoMerge, autoDeleteMergedSegments } = get(userSettingsAtom);
    if (segmentsToChaptersOnly) return 'segments_to_chapters' as const;
    if (autoMerge && autoDeleteMergedSegments) return 'merge' as const;
    if (autoMerge) return 'merge+separate' as const;
    return 'separate' as const;
});

export const maxLabelLengthAtom = atom((get) => (get(userSettingsAtom).safeOutputFileName ? 100 : 500));

export const hideAllNotificationsAtom = atom((get) => get(userSettingsAtom).hideNotifications === 'all');
