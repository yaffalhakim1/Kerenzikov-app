import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

import { loadThemePreference, saveThemePreference } from './theme-preference-store';
import { resolveScheme, type ThemePreference } from './theme-preference';

interface ThemePreferenceValue {
  /** The saved choice: `system`, `light` or `dark`. */
  preference: ThemePreference;
  /** What to paint with — the preference resolved against the OS. */
  scheme: 'light' | 'dark';
  setPreference: (value: ThemePreference) => void;
}

const ThemePreferenceContext = createContext<ThemePreferenceValue | null>(null);

/**
 * The one place the app's scheme is decided.
 *
 * Every screen already reads the resolved scheme through `useTheme()`, so
 * putting the choice here re-themes the whole app without touching a call
 * site. The saved value lands after the first frame — `system` is the
 * initial value — because a theme is chrome and must never gate first paint.
 */
export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let cancelled = false;
    loadThemePreference().then((saved) => {
      if (!cancelled) setPreferenceState(saved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    saveThemePreference(value);
  }, []);

  const value = useMemo<ThemePreferenceValue>(() => ({
    preference,
    scheme: resolveScheme(preference, systemScheme),
    setPreference,
  }), [preference, setPreference, systemScheme]);

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreferenceValue {
  const value = useContext(ThemePreferenceContext);
  if (!value) {
    // The usual cause is a component that renders ThemePreferenceProvider
    // and reads the scheme in the same function — a provider cannot be read by
    // whoever renders it. Split the themed part into a child (`ThemedApp` in
    // `app/_layout.tsx` is the precedent) rather than moving the provider down.
    throw new Error(
      'useThemePreference must be used inside ThemePreferenceProvider; if this ' +
      'component renders the provider, move its themed content into a child',
    );
  }
  return value;
}
