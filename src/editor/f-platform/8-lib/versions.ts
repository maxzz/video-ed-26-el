import { homepageUrl } from "@shared/constants";

// Release links of this app (shared/constants.ts getReleaseUrl/compareReleasesUrl point to upstream LosslessCut)
export const getAppReleaseUrl = (version: string) => `${homepageUrl}/releases/tag/v${version}`;
export const getAppCompareReleasesUrl = (fromVersion: string, toVersion: string) => `${homepageUrl}/compare/v${fromVersion}...v${toVersion}`;

const versionRegex = /^v?\d+(\.\d+)*(-.*)?$/;

export const isValidVersion = (version: string | undefined): version is string => version != null && versionRegex.test(version);

/** Numeric comparison of dotted versions, ignoring prerelease tags. Returns < 0 if a < b */
export function compareVersions(a: string, b: string) {
    const parse = (v: string) => v.replace(/^v/, '').split('-')[0]!.split('.').map((n) => parseInt(n, 10) || 0);
    const pa = parse(a);
    const pb = parse(b);
    for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) {
            return diff;
        }
    }
    return 0;
}

/** Whether the What's new dialog should be shown after starting `currentVersion` when the previous run was `lastVersion` */
export function shouldShowWhatsNew(lastVersion: string | undefined, currentVersion: string) {
    // first run (no last version) or dev/web builds without a real version
    if (!isValidVersion(lastVersion) || !isValidVersion(currentVersion)) {
        return false;
    }
    return compareVersions(lastVersion, currentVersion) < 0;
}

/** Shape of https://losslesscut.mifi.no/config.json that upstream shows on the "no file loaded" screen */
export interface MifiLink {
    loadUrl?: string;
    targetUrl?: string;
}

export function parseMifiLink(data: unknown): MifiLink | undefined {
    if (data == null || typeof data !== 'object') {
        return undefined;
    }
    const { loadUrl, targetUrl } = data as Record<string, unknown>;
    if (typeof loadUrl !== 'string' || !loadUrl) {
        return undefined;
    }
    return { loadUrl, ...(typeof targetUrl === 'string' && { targetUrl }) };
}
