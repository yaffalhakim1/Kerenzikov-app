import { DaemonOnboarding } from '@/components/daemon-onboarding';
import { useDaemon } from '@/lib/daemon-context';

import NewTaskScreen from './new-task';

/**
 * Expo Router renders this when the screen below throws, instead of tearing the
 * whole tree down. See `route-error-boundary` — it also writes the error to
 * disk, which is the only copy a release build has.
 */
export { ErrorBoundary } from '@/components/route-error-boundary';


export default function HomeScreen() {
  const daemon = useDaemon();

  if (daemon.phase === 'booting') return null;

  return daemon.profiles.length ? (
    <NewTaskScreen />
  ) : (
    <DaemonOnboarding />
  );
}
