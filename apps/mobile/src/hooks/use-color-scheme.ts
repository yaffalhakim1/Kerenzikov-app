import { useThemePreference } from '@/lib/theme-preference-context';

/**
 * The scheme the app should paint with, honouring the saved preference.
 *
 * Screens ask this rather than React Native's own `useColorScheme` so an
 * explicit Light/Dark choice reaches every surface — including the ones that
 * only need the scheme name, such as the native menu containers.
 */
export function useColorScheme() {
  return useThemePreference().scheme;
}