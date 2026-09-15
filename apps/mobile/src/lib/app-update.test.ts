import { describe, expect, test } from 'bun:test';

import {
  availableUpdate,
  currentVersionCode,
  isDownloadUrl,
  parseManifest,
  type UpdateManifest,
} from './app-update';

function manifest(overrides: Partial<UpdateManifest> = {}): UpdateManifest {
  return {
    versionCode: 11,
    versionName: '0.1.29',
    url: 'https://example.test/Kerenzikov-0.1.29.apk',
    ...overrides,
  };
}

describe('app update', () => {
  test('offers an update only when the build number is strictly greater', () => {
    expect(availableUpdate(manifest({ versionCode: 11 }), 10)?.latest).toBe(11);
    expect(availableUpdate(manifest({ versionCode: 10 }), 10)).toBeNull();
    expect(availableUpdate(manifest({ versionCode: 9 }), 10)).toBeNull();
  });

  test('offers nothing without a manifest', () => {
    expect(availableUpdate(null, 10)).toBeNull();
  });

  test('carries the download url and version name through', () => {
    const update = availableUpdate(manifest(), 10);
    expect(update?.url).toBe('https://example.test/Kerenzikov-0.1.29.apk');
    expect(update?.versionName).toBe('0.1.29');
    expect(update?.current).toBe(10);
  });

  test('rejects a manifest that is not an object', () => {
    expect(parseManifest(null)).toBeNull();
    expect(parseManifest('11')).toBeNull();
    expect(parseManifest(11)).toBeNull();
  });

  test('rejects a manifest without a usable build number or url', () => {
    expect(parseManifest({ versionName: '0.1.29', url: 'https://x.test/a.apk' })).toBeNull();
    expect(parseManifest({ versionCode: 11 })).toBeNull();
    expect(parseManifest({ versionCode: 11, url: '' })).toBeNull();
  });

  test('rejects a download url that is not https', () => {
    // A manifest is authored by a build script, and the failure worth
    // catching is a URL that looks plausible but cannot be installed from.
    expect(isDownloadUrl('https://github.com/o/r/releases/download/v1/a.apk')).toBe(true);
    expect(isDownloadUrl('http://github.com/o/r/releases/download/v1/a.apk')).toBe(false);
    expect(isDownloadUrl('github.com/o/r/releases/download/v1/a.apk')).toBe(false);
    expect(isDownloadUrl('not a url')).toBe(false);
    expect(isDownloadUrl('')).toBe(false);
    expect(
      parseManifest({ versionCode: 12, url: 'http://x.test/a.apk' }),
    ).toBeNull();
  });

  test('keeps the version segment a release asset URL needs', () => {
    // The regression: GitHub versions assets by tag, so a URL assembled
    // without it 404s. Whatever a build script emits must survive the parser
    // unchanged for the user to reach the file.
    const url =
      'https://github.com/yaffalhakim1/Kerenzikov-app/releases/download/v0.1.31/Kerenzikov-0.1.31-universal.apk';
    expect(parseManifest({ versionCode: 12, url })?.url).toBe(url);
    expect(availableUpdate(parseManifest({ versionCode: 12, url })!, 11)?.url).toBe(url);
  });

  test('defaults the version name to the build number when it is missing', () => {
    const parsed = parseManifest({ versionCode: 12, url: 'https://x.test/a.apk' });
    expect(parsed?.versionName).toBe('12');
  });

  test('reports an installed build number even outside Android', () => {
    // The value is only used for comparison, so a web/test host reading 0
    // must not throw.
    expect(currentVersionCode()).toBe(0);
    expect(currentVersionCode({ android: { versionCode: 10 } })).toBe(10);
    expect(currentVersionCode({ android: null })).toBe(0);
  });
});
