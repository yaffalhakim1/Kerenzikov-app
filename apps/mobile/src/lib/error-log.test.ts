import { describe, expect, test } from 'bun:test';

import { recentLines } from './error-log';

/**
 * `recentLines` is the only part of the logger that is pure, and it is the part
 * that decides what a crash report actually contains — so it is the part worth
 * pinning. The rest is filesystem calls, exercised by using the feature.
 */

function entry(at: number, message: string): string {
  return `[${new Date(at).toISOString()}] ERROR scope: ${message}\n\n`;
}

describe('recentLines', () => {
  const now = Date.UTC(2026, 0, 10);

  test('keeps entries inside the age window', () => {
    const text = entry(now - 1_000, 'fresh');
    expect(recentLines(text, now)).toContain('fresh');
  });

  test('drops entries past the age window', () => {
    // Eight days: past the seven-day cap, so it must not bury today's crash.
    const old = entry(now - 8 * 24 * 60 * 60 * 1000, 'stale');
    const fresh = entry(now - 1_000, 'fresh');
    const kept = recentLines(old + fresh, now);
    expect(kept).not.toContain('stale');
    expect(kept).toContain('fresh');
  });

  test('keeps an unparseable stamp rather than silently discarding evidence', () => {
    // A truncated or hand-edited file must not lose the entry that explains a
    // crash; dropping what cannot be dated is the wrong way to fail.
    const text = '[not-a-date] ERROR scope: hand written\n\n';
    expect(recentLines(text, now)).toContain('hand written');
  });

  test('returns empty for an empty log', () => {
    expect(recentLines('', now)).toBe('');
  });

  test('preserves order, newest last', () => {
    const text =
      entry(now - 3_000, 'first') + entry(now - 2_000, 'second') + entry(now - 1_000, 'third');
    const kept = recentLines(text, now);
    expect(kept.indexOf('first')).toBeLessThan(kept.indexOf('second'));
    expect(kept.indexOf('second')).toBeLessThan(kept.indexOf('third'));
  });
});
