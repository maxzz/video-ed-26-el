import { app } from 'electron';
import { homepageUrl } from '@shared/constants.ts';
import logger from './logger.ts';

/** `https://github.com/<owner>/<repo>` -> GitHub API URL of the latest full release (drafts and prereleases are not returned) */
export function getLatestReleaseApiUrl(repoUrl: string) {
    const match = /github\.com\/([^/]+)\/([^/#?]+)/.exec(repoUrl);
    if (!match) {
        throw new Error(`Not a GitHub repository URL: ${repoUrl}`);
    }
    return `https://api.github.com/repos/${match[1]}/${match[2]!.replace(/\.git$/, '')}/releases/latest`;
}

/** Numeric semver-ish comparison, ignoring prerelease tags. Returns < 0 if a < b */
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

/** Returns the newest released version of this app if it's newer than the running one */
export async function checkNewVersion() {
    try {
        const res = await fetch(getLatestReleaseApiUrl(homepageUrl), { headers: { 'X-GitHub-Api-Version': '2022-11-28', Accept: 'application/vnd.github+json' } });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json() as { tag_name: string; };
        const newestVersion = data.tag_name.replace(/^v?/, '');
        const currentVersion = app.getVersion();
        logger.info('Current version', currentVersion, 'newest version', newestVersion);
        return compareVersions(currentVersion, newestVersion) < 0 ? newestVersion : undefined;
    } catch (err) {
        logger.error('Failed to check github version', err instanceof Error ? err.message : String(err));
        return undefined;
    }
}
