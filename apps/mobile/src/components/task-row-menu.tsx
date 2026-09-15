import { MenuView, type MenuAction } from '@expo/ui/community/menu';

import { AppPressable } from '@/components/app-pressable';

import type { TaskRowMenuProps } from '@/components/task-row-menu.types';

const Actions: MenuAction[] = [
  { id: 'rename', title: 'Rename task', image: 'pencil' },
  {
    id: 'remove',
    title: 'Remove from list',
    image: 'eye.slash',
    attributes: { destructive: true },
  },
];

export function TaskRowMenu({
  accessibilityLabel,
  onRemove,
  onRename,
  onSelect,
  renderTrigger,
  selected,
  style,
}: TaskRowMenuProps) {
  return (
    <MenuView
      actions={Actions}
      onPressAction={({ nativeEvent }) => {
        if (nativeEvent.event === 'rename') onRename();
        else if (nativeEvent.event === 'remove') onRemove();
      }}
      shouldOpenOnLongPress
      style={style}>
      <AppPressable
        accessibilityHint="Long press for actions"
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onSelect}>
        {({ pressed }) => renderTrigger(pressed)}
      </AppPressable>
    </MenuView>
  );
}
