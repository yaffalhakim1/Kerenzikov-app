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
import { Uniwind } from 'uniwind';

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

  const scheme = resolveScheme(preference, systemScheme);

  /*
   * PanelUI's classes resolve through Uniwind, which reads the *OS* scheme
   * (`Appearance.getColorScheme()`) and knows nothing about this app's saved
   * preference. Left alone, the two disagree the moment Dark is chosen while
   * the phone is Light: every PanelUI surface — the todo panel, `Frame`, the
   * composers, the new-task page — paints its own theme tokens against a
   * light-scheme Uniwind while the house surfaces repaint from `useTheme()`.
   * That is the split that left some text dark and some light.
   *
   * This provider is the one place the app decides its scheme, so it is also
   * where Uniwind is told. `setTheme` takes a concrete name here rather than
   * `system`: the preference has already been resolved against the OS, and
   * passing `system` would hand the decision straight back.
   */
  useEffect(() => {
    Uniwind.setTheme(scheme);
  }, [scheme]);

  const value = useMemo<ThemePreferenceValue>(() => ({
    preference,
    scheme,
    setPreference,
  }), [preference, scheme, setPreference]);

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
