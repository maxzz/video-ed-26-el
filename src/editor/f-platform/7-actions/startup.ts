import i18n from 'i18next';
import { appStore } from '@/editor/0-core/9-state/store.ts';
import { userSettings } from '@/editor/0-core/9-state/user-settings.ts';
import { getAppInfo, mainEvents } from '@/editor/0-core/8-lib/main-api.ts';
import { isStoreBuild } from '@/editor/0-core/8-lib/util.ts';
import { mifiLinkAtom, newVersionAtom } from '../9-state/platform.ts';
import { parseMifiLink, shouldShowWhatsNew } from '../8-lib/versions.ts';
import { openWhatsNewDialog } from '../0-ui/whats-new-dialog.tsx';
import { showNewVersionNotice } from '../0-ui/new-version-notice.tsx';

const mifiConfigUrl = 'https://losslesscut.mifi.no/config.json';

/** Toasts fired before the Toaster mounts are lost, and the update notice is not urgent */
const noticeDelayMs = 3000;

function setNewVersion(version: string | undefined) {
    if (!version || appStore.get(newVersionAtom) === version) {
        return;
    }
    appStore.set(newVersionAtom, version);
    setTimeout(() => showNewVersionNotice(version), noticeDelayMs);
}

async function loadMifiLink() {
    try {
        const res = await fetch(mifiConfigUrl);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        appStore.set(mifiLinkAtom, parseMifiLink(await res.json()));
    } catch (err) {
        if (getAppInfo().isDev) console.error('Failed to load mifi link', err);
    }
}

function checkWhatsNew() {
    const { version } = getAppInfo();
    const lastVersion = userSettings.lastAppVersion;
    if (lastVersion === version) {
        return;
    }
    userSettings.lastAppVersion = version;
    if (shouldShowWhatsNew(lastVersion, version)) {
        openWhatsNewDialog({ fromVersion: lastVersion, toVersion: version });
    }
}

function runPlatformStartup() {
    const { newVersion, disableNetworking } = getAppInfo();
    setNewVersion(newVersion);
    checkWhatsNew();
    if (!isStoreBuild && !disableNetworking) {
        loadMifiLink();
    }
}

let initialized = false;

/**
 * Feature modules are imported before initEditor() has loaded app info and user settings,
 * so start once i18n is initialized, which is the last step of initEditor().
 */
export function initPlatform() {
    if (initialized) return;
    initialized = true;

    // the main process update check usually finishes after the window has loaded
    mainEvents.on('newVersionAvailable', (version) => setNewVersion(version));

    if (i18n.isInitialized) {
        runPlatformStartup();
    } else {
        const onInitialized = () => {
            i18n.off('initialized', onInitialized);
            runPlatformStartup();
        };
        i18n.on('initialized', onInitialized);
    }
}
