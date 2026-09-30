import AsyncStorage from '@react-native-async-storage/async-storage';

import { isThemePreference, type ThemePreference } from './theme-preference';

const KEY = 'waku.mobile.theme.v1';

/** The saved preference, or `system` when nothing valid is stored. A theme is
 *  chrome: an unreadable value must never block the first frame. */
export async function loadThemePreference(): Promise<ThemePreference> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return isThemePreference(raw) ? raw : 'system';
  } catch {
    return 'system';
  }
}

export function saveThemePreference(value: ThemePreference): void {
  void AsyncStorage.setItem(KEY, value).catch(() => {});
}