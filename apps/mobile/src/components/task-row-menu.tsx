import { useRef } from 'react';
import { MenuView, type MenuAction, type MenuComponentRef } from '@expo/ui/community/menu';

import { AnimatedPressable } from 'panelui-native/primitives/animated-pressable';

import { StateLayer } from '@/constants/theme';
import { longPressHaptic } from '@/lib/haptics';
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
      {/*
        PanelUI's own pressable primitive, so the row's touch handling and the
        scale/opacity feedback run on the UI thread rather than through a
        JavaScript-driven press. `pressScale={1}` because this is a full-width
        row: PanelUI's rule is that a wide target which shrinks reads as a card
        rather than as a press, and the row already draws its own pressed state
        through `renderTrigger`. The Material ripple is kept explicitly — it is
        the one piece of Android press feedback PanelUI has no equivalent for,
        and the row's list would otherwise be the only one in the app without
        it.
      */}
      <AnimatedPressable
        accessibilityHint="Long press for actions"
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        android_ripple={{
          color: scheme === 'dark' ? StateLayer.dark : StateLayer.light,
        }}
        hitSlop={8}
        onLongPress={() => {
          longPressHaptic();
          menu.current?.show();
        }}
        onPress={onSelect}
        pressScale={1}>
        {({ pressed }) => renderTrigger(pressed)}
      </AnimatedPressable>
    </MenuView>
  );
}
