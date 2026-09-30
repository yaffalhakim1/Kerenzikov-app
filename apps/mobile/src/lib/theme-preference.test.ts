import { describe, expect, test } from 'bun:test';

import {
  isThemePreference,
  resolveScheme,
  themePreferenceLabel,
} from './theme-preference';

describe('theme preference', () => {
  test('an explicit choice overrides the system scheme', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('light', null)).toBe('light');
    expect(resolveScheme('dark', null)).toBe('dark');
  });

  test('system follows the OS and defaults to light when it is unknown', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
    // A null scheme is "not reported yet", which must paint light rather than
    // flash dark and then correct itself.
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('system', undefined)).toBe('light');
  });

  test('only the three known values are accepted', () => {
    expect(isThemePreference('system')).toBe(true);
    expect(isThemePreference('light')).toBe(true);
    expect(isThemePreference('dark')).toBe(true);
    expect(isThemePreference('Dark')).toBe(false);
    expect(isThemePreference('')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
    expect(isThemePreference(undefined)).toBe(false);
  });

  test('every preference has a label', () => {
    expect(themePreferenceLabel('system')).toBe('System');
    expect(themePreferenceLabel('light')).toBe('Light');
    expect(themePreferenceLabel('dark')).toBe('Dark');
  });
});