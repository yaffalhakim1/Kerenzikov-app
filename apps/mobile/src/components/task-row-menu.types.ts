import type { ReactElement } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface TaskRowMenuProps {
  accessibilityLabel: string;
  /** Whether the task is currently archived, which decides the archive row's
   *  label and direction. */
  archived: boolean;
  /** Whether the task is pinned, which decides the pin row's label. */
  pinned: boolean;
  onArchive: () => void;
  onDelete: () => void;
  onPin: () => void;
  onRename: () => void;
  onSelect: () => void;
  renderTrigger: (pressed: boolean) => ReactElement;
  selected: boolean;
  style: StyleProp<ViewStyle>;
}
