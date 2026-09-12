import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { View } from 'react-native';

import { AppSymbol } from '@/components/app-symbol';
import { DaemonList } from '@/components/daemon-list';
import { Sheet, SheetRow } from '@/components/sheet';
import { NativeTint } from '@/constants/theme';
import { useDaemon } from '@/lib/daemon-context';
import type { DaemonProfile } from '@/lib/daemon-profile';

/**
 * Daemon switcher. A picker only — every add/edit flow routes to the
 * full-screen daemon-editor. The Material 3 sheet modal steals the first tap
 * after presentation until a dismiss gesture registers, which made inline
 * form fields here need several taps to focus; the pushed screen has no such
 * gate and its form works on the first touch (see _layout.tsx).
 */
export function DaemonPickerSheet({
  onDismiss,
  visible,
}: {
  onDismiss: () => void;
  visible: boolean;
}) {
  const daemon = useDaemon();

  function select(profileToSelect: DaemonProfile) {
    onDismiss();
    if (profileToSelect.id === daemon.activeProfile?.id) return;
    void Haptics.selectionAsync();
    void daemon.selectProfile(profileToSelect.id).then((connected) => {
      if (!connected) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    });
  }

  return (
    <Sheet onDismiss={onDismiss} visible={visible}>
      <DaemonList
        onEdit={(item) => {
          onDismiss();
          router.push({ pathname: '/daemon-editor', params: { id: item.id } });
        }}
        onSelect={select}
      />
      <SheetRow
        description="Connect another host"
        label="Add Daemon…"
        leading={(
          <AppSymbol
            name={{ ios: 'plus.circle', android: 'add_circle', web: 'add_circle' }}
            size={22}
            tintColor={NativeTint}
          />
        )}
        onPress={() => {
          onDismiss();
          router.push('/daemon-editor');
        }}
      />
    </Sheet>
  );
}
