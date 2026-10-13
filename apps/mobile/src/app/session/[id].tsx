import { useLocalSearchParams } from 'expo-router';

import { SessionView } from '@/components/session-view';

/**
 * Expo Router renders this when the screen below throws, instead of tearing the
 * whole tree down. See `route-error-boundary` — it also writes the error to
 * disk, which is the only copy a release build has.
 */
export { ErrorBoundary } from '@/components/route-error-boundary';


export default function SessionScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    devPrompt?: string | string[];
    devError?: string | string[];
    devFixtures?: string | string[];
  }>();
  const sessionId = Array.isArray(params.id) ? params.id[0] : params.id;
  const devPrompt = Array.isArray(params.devPrompt) ? params.devPrompt[0] : params.devPrompt;
  const devError = Array.isArray(params.devError) ? params.devError[0] : params.devError;
  const devFixtures = Array.isArray(params.devFixtures) ? params.devFixtures[0] : params.devFixtures;
  return (
    <SessionView
      devError={__DEV__ ? devError : undefined}
      devFixtures={__DEV__ ? devFixtures === '1' : undefined}
      devPrompt={__DEV__ ? devPrompt : undefined}
      sessionId={sessionId}
    />
  );
}
