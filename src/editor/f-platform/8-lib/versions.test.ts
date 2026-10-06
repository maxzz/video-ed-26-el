import { describe, expect, it } from "vitest";

import { compareVersions, getAppCompareReleasesUrl, getAppReleaseUrl, parseMifiLink, shouldShowWhatsNew } from "./versions";

describe('compareVersions', () => {
    it('compares numerically', () => {
        expect(compareVersions('0.26.1', '0.26.1')).toBe(0);
        expect(compareVersions('0.9.0', '0.10.0')).toBeLessThan(0);
        expect(compareVersions('1.0', '0.99.99')).toBeGreaterThan(0);
    });
});

describe('shouldShowWhatsNew', () => {
    it('only shows after an upgrade', () => {
        expect(shouldShowWhatsNew('0.26.0', '0.26.1')).toBe(true);
        expect(shouldShowWhatsNew('0.26.1', '0.26.1')).toBe(false);
        expect(shouldShowWhatsNew('0.27.0', '0.26.1')).toBe(false);
        expect(shouldShowWhatsNew('', '0.26.1')).toBe(false);
        expect(shouldShowWhatsNew(undefined, '0.26.1')).toBe(false);
        expect(shouldShowWhatsNew('0.26.0', 'web')).toBe(false);
    });
});

it('builds release urls', () => {
    expect(getAppReleaseUrl('1.2.3')).toMatch(/\/releases\/tag\/v1\.2\.3$/);
    expect(getAppCompareReleasesUrl('1.0.0', '1.2.3')).toMatch(/\/compare\/v1\.0\.0\.\.\.v1\.2\.3$/);
});

describe('parseMifiLink', () => {
    it('validates the remote config', () => {
        expect(parseMifiLink({ loadUrl: 'https://a', targetUrl: 'https://b', other: 1 })).toEqual({ loadUrl: 'https://a', targetUrl: 'https://b' });
        expect(parseMifiLink({ loadUrl: 'https://a' })).toEqual({ loadUrl: 'https://a' });
        expect(parseMifiLink({ loadUrl: '' })).toBeUndefined();
        expect(parseMifiLink(null)).toBeUndefined();
        expect(parseMifiLink('x')).toBeUndefined();
    });
});
