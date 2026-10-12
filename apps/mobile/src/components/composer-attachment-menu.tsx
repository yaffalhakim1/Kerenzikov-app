import { MenuView, type MenuAction } from '@expo/ui/community/menu';

import { AppSymbol } from './app-symbol';
import { AIInput } from 'panelui-native/components/ai-input';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export type ComposerAttachmentSource = 'files' | 'camera' | 'photo';

const AttachmentActions: MenuAction[] = [
  { id: 'files', title: 'Files', image: 'folder' },
  { id: 'camera', title: 'Camera', image: 'camera' },
  { id: 'photo', title: 'Photo', image: 'photo' },
];

export function ComposerAttachmentMenu({
  disabled = false,
  onChoose,
}: {
  disabled?: boolean;
  onChoose: (source: ComposerAttachmentSource) => void;
}) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const trigger = (
    <AIInput.Action
      disabled={disabled}
      icon={
        <AppSymbol
          name={{ ios: 'plus', android: 'add', web: 'add' }}
          size={19}
          tintColor={theme.textSecondary}
        />
      }
      label="Add attachment"
    />
  );
  if (disabled) return trigger;

  return (
    <MenuView
      actions={AttachmentActions}
      colorScheme={scheme}
      onPressAction={({ nativeEvent }) => {
        const source = nativeEvent.event as ComposerAttachmentSource;
        // Let the native menu finish dismissing before presenting a picker.
        setTimeout(() => onChoose(source), 160);
      }}>
      {trigger}
    </MenuView>
  );
}

