import { DaemonOnboarding } from '@/components/daemon-onboarding';
import { useDaemon } from '@/lib/daemon-context';

import NewTaskScreen from './new-task';

export default function HomeScreen() {
  const daemon = useDaemon();

  if (daemon.phase === 'booting') return null;

  return daemon.profiles.length ? (
    <NewTaskScreen />
  ) : (
    <DaemonOnboarding />
  );
}
