import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({ app: { getVersion: () => '1.0.0' } }));
vi.mock('./logger.ts', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const { compareVersions, getLatestReleaseApiUrl } = await import('./update-checker.ts');

describe('compareVersions', () => {
    it('compares numerically', () => {
        expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
        expect(compareVersions('1.2.3', '1.10.0')).toBeLessThan(0);
        expect(compareVersions('2.0', '1.99.99')).toBeGreaterThan(0);
        expect(compareVersions('v1.0.0', '1.0.1')).toBeLessThan(0);
        expect(compareVersions('1.0.0-beta.2', '1.0.0')).toBe(0);
    });
});

describe('getLatestReleaseApiUrl', () => {
    it('builds the GitHub API URL', () => {
        expect(getLatestReleaseApiUrl('https://github.com/maxzz/video-ed-26-el')).toBe('https://api.github.com/repos/maxzz/video-ed-26-el/releases/latest');
        expect(getLatestReleaseApiUrl('https://github.com/mifi/lossless-cut/')).toBe('https://api.github.com/repos/mifi/lossless-cut/releases/latest');
        expect(() => getLatestReleaseApiUrl('https://example.com')).toThrow();
    });
});
