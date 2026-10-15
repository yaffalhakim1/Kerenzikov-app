import { useRef } from 'react';
import { MenuView, type MenuAction, type MenuComponentRef } from '@expo/ui/community/menu';
import { Button } from 'panelui-native/components/button';
import { Item } from 'panelui-native/components/item';

import { AppSymbol } from '@/components/app-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { tapHaptic } from '@/lib/haptics';

import { queuedMessageLabel, type QueuedMessageRowProps } from '@/components/queued-message-row.types';

/**
 * A queued follow-up on Android. The row is a PanelUI `Item` and its trailing
 * control a PanelUI `Button`; both open the native actions menu through the
 * `MenuView` ref, because `MenuView` wraps its children in a `Pressable` — a
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
  const openMenu = () => {
    tapHaptic();
    menu.current?.show();
  };
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
      shouldOpenOnLongPress>
      <Item
        accessibilityHint="Opens queued message actions"
        accessibilityLabel={label}
        onPress={openMenu}
        size="xs"
        variant="muted">
        <Item.Media>
          <AppSymbol
            name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
            size={12}
            tintColor={theme.textTertiary}
          />
        </Item.Media>
        <Item.Content>
          <Item.Title numberOfLines={1}>{label}</Item.Title>
        </Item.Content>
        <Item.Actions>
          <Button
            accessibilityLabel="Queued message actions"
            onPress={openMenu}
            size="xs"
            variant="ghost">
            <AppSymbol
              name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
              size={15}
              tintColor={theme.textTertiary}
            />
          </Button>
        </Item.Actions>
      </Item>
    </MenuView>
  );
}
