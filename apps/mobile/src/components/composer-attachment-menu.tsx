import { MenuView, type MenuAction } from '@expo/ui/community/menu';
import { StyleSheet, View } from 'react-native';

import { AppSymbol } from './app-symbol';
import { Radius } from '@/constants/theme';
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
    <View
      accessible
      accessibilityLabel="Add attachment"
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.trigger, { opacity: disabled ? 0.35 : 1 }]}>
      <AppSymbol
        name={{ ios: 'plus', android: 'add', web: 'add' }}
        size={19}
        tintColor={theme.textSecondary}
      />
    </View>
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

const styles = StyleSheet.create({
  // A plain plus at the same 36pt footprint as its neighbours: the ring made
  // this one control a different shape from the rest of the row, and at the
  // shared icon size the strokes sat too close to it to read cleanly.
  trigger: {
    alignItems: 'center',
    borderRadius: Radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
