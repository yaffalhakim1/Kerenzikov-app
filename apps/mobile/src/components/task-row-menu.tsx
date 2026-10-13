import { useRef } from 'react';
import { MenuView, type MenuAction, type MenuComponentRef } from '@expo/ui/community/menu';

import { AppPressable } from '@/components/app-pressable';
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
      {/*
        `AppPressable`, not PanelUI's `AnimatedPressable`, and this is
        load-bearing: `MenuView` is an `@expo/ui` Compose host, and a Reanimated
        pressable inside it makes Reanimated's mount pass measure through that
        host, which throws

          IllegalArgumentException: performMeasureAndLayout called during
          measure layout

        and takes the drawer down as it opens. A plain RN `Pressable` never
        touches the Compose host on the UI thread, which is what this row used
        before the PanelUI conversion.
      */}
      <AppPressable
        accessibilityHint="Long press for actions"
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onLongPress={() => {
          longPressHaptic();
          menu.current?.show();
        }}
        onPress={onSelect}>
        {({ pressed }) => renderTrigger(pressed)}
      </AppPressable>
    </MenuView>
  );
}
