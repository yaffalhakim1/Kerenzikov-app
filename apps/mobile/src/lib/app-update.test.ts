import { describe, expect, test } from 'bun:test';

import {
  availableUpdate,
  currentVersionCode,
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
