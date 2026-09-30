import { useEffect, useState } from 'react';

import { useThemePreference } from '@/lib/theme-preference-context';

/**
 * To support static rendering, this value needs to be re-calculated on the
 * client side for web. The saved preference is applied by
 * `ThemePreferenceProvider` once storage has been read.
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const scheme = useThemePreference().scheme;

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (hasHydrated) {
    return scheme;
  }

  return 'light';
}