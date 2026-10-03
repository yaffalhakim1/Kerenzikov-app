import { useRef } from 'react';
import { MenuView, type MenuAction, type MenuComponentRef } from '@expo/ui/community/menu';

import { AppPressable } from '@/components/app-pressable';
import { useColorScheme } from '@/hooks/use-color-scheme';

import type { TaskRowMenuProps } from '@/components/task-row-menu.types';

export function TaskRowMenu({
  accessibilityLabel,
  archived,
  pinned,
  onArchive,
  onDelete,
  onPin,
  onRename,
  onSelect,
  renderTrigger,
  selected,
  style,
}: TaskRowMenuProps) {
  const scheme = useColorScheme();
  const menu = useRef<MenuComponentRef>(null);
  const actions: MenuAction[] = [
    { id: 'rename', title: 'Rename task', image: 'pencil' },
    {
      id: 'pin',
      title: pinned ? 'Unpin' : 'Pin',
      image: pinned ? 'pin.slash' : 'pin',
    },
    {
      id: 'archive',
      title: archived ? 'Unarchive' : 'Archive',
      image: archived ? 'tray.and.arrow.up' : 'archivebox',
    },
    {
      id: 'delete',
      title: 'Delete',
      image: 'trash',
      attributes: { destructive: true },
    },
  ];
  return (
    <MenuView
      ref={menu}
      actions={actions}
      colorScheme={scheme}
      onPressAction={({ nativeEvent }) => {
        if (nativeEvent.event === 'rename') onRename();
        else if (nativeEvent.event === 'pin') onPin();
        else if (nativeEvent.event === 'archive') onArchive();
        else if (nativeEvent.event === 'delete') onDelete();
      }}
      // The menu is opened from our own pressable below, not MenuView's trigger.
      // MenuView wraps its children in a Pressable; nesting ours inside it made
      // the inner one the touch responder, so MenuView's long-press never fired
      // and a long press just ran the inner onPress (opening the task).
      shouldOpenOnLongPress
      style={style}>
      <AppPressable
        accessibilityHint="Long press for actions"
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onLongPress={() => menu.current?.show()}
        onPress={onSelect}>
        {({ pressed }) => renderTrigger(pressed)}
      </AppPressable>
    </MenuView>
  );
}
