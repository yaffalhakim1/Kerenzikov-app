import { Button, Host, Menu, RNHostView } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityHint,
  accessibilityLabel,
} from '@expo/ui/swift-ui/modifiers';
import { Text, View } from 'react-native';

import { AppSymbol } from '@/components/app-symbol';
import { useTheme } from '@/hooks/use-theme';

import {
  queuedMessageLabel,
  queuedMessageRowStyles as styles,
  type QueuedMessageRowProps,
} from '@/components/queued-message-row.types';

/**
 * A queued follow-up on iOS. SwiftUI `Menu` opens on a tap of its label, which
 * is the row itself — the same tap-to-open the reference uses, and the reason
 * this file exists rather than reusing the Android long-press wrapper.
 */
export function QueuedMessageRow({
  canSteer,
  message,
  onEdit,
  onRemove,
  onSendNow,
}: QueuedMessageRowProps) {
  const theme = useTheme();
  const label = queuedMessageLabel(message);
  return (
    <Host ignoreSafeArea="all" matchContents style={styles.menu}>
      <Menu
        label={(
          <RNHostView matchContents>
            <View
              style={[
                styles.row,
                { backgroundColor: theme.overlay, borderColor: theme.border },
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
            </View>
          </RNHostView>
        )}
        modifiers={[
          accessibilityLabel(label),
          accessibilityHint('Opens queued message actions'),
          accessibilityAddTraits(['isButton']),
        ]}>
        {canSteer && <Button label="Send now" systemImage="arrow.up" onPress={onSendNow} />}
        <Button label="Edit" systemImage="pencil" onPress={onEdit} />
        <Button label="Remove" role="destructive" systemImage="trash" onPress={onRemove} />
      </Menu>
    </Host>
  );
}
