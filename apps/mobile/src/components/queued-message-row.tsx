import { useRef } from 'react';
import { MenuView, type MenuAction, type MenuComponentRef } from '@expo/ui/community/menu';
import { Text } from 'react-native';

import { AppPressable } from '@/components/app-pressable';
import { AppSymbol } from '@/components/app-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { tapHaptic } from '@/lib/haptics';

import {
  queuedMessageLabel,
  queuedMessageRowStyles as styles,
  type QueuedMessageRowProps,
} from '@/components/queued-message-row.types';

/**
 * A queued follow-up on Android. The menu is opened from our own pressable via
 * the `MenuView` ref: `MenuView` wraps its children in a `Pressable`, so a
 * nested trigger would swallow the gesture (see `task-row-menu.tsx`).
 */
export function QueuedMessageRow({
  canSteer,
  message,
  onEdit,
  onRemove,
  onSendNow,
}: QueuedMessageRowProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const menu = useRef<MenuComponentRef>(null);
  const actions: MenuAction[] = [];
  if (canSteer) actions.push({ id: 'send-now', title: 'Send now', image: 'arrow.up' });
  actions.push({ id: 'edit', title: 'Edit', image: 'pencil' });
  actions.push({ id: 'remove', title: 'Remove', image: 'trash', attributes: { destructive: true } });
  const label = queuedMessageLabel(message);
  return (
    <MenuView
      ref={menu}
      actions={actions}
      colorScheme={scheme}
      onPressAction={({ nativeEvent }) => {
        if (nativeEvent.event === 'send-now') onSendNow();
        else if (nativeEvent.event === 'edit') onEdit();
        else if (nativeEvent.event === 'remove') onRemove();
      }}
      shouldOpenOnLongPress
      style={styles.menu}>
      <AppPressable
        accessibilityHint="Opens queued message actions"
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={() => {
          tapHaptic();
          menu.current?.show();
        }}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: theme.overlay,
            borderColor: theme.border,
            opacity: pressed ? 0.6 : 1,
          },
        ]}>
        <AppSymbol
          name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
          size={12}
          tintColor={theme.textTertiary}
        />
        <Text numberOfLines={1} style={[styles.text, { color: theme.textSecondary }]}>
          {label}
        </Text>
        <AppSymbol
          name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
          size={15}
          tintColor={theme.textTertiary}
        />
      </AppPressable>
    </MenuView>
  );
}
