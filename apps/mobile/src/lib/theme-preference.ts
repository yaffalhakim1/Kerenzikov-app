import type { ColorSchemeName } from 'react-native';

/**
 * Mirrors the desktop's `ThemePreference` (`crates/waku-protocol/src/theme.rs`):
 * the same three choices in the same order, so the two clients cannot drift.
 * The desktop persists this in its settings file; the phone keeps it locally,
 * because a phone's theme is about the phone, not the daemon it is talking to.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

const LABELS: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

export function themePreferenceLabel(value: ThemePreference): string {
  return LABELS[value];
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

/**
 * The scheme to paint with: an explicit choice wins, `system` follows the OS.
 * Anything that is not a dark system reads as light, which is how the palettes
 * were already selected.
 */
export function resolveScheme(
  preference: ThemePreference,
  system: ColorSchemeName | null | undefined,
): 'light' | 'dark' {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return system === 'dark' ? 'dark' : 'light';
}