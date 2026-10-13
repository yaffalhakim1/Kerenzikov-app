import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import {
  Alert,
  Share,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { AppPressable } from '@/components/app-pressable';
import { useTheme } from '@/hooks/use-theme';
import { tapHaptic } from '@/lib/haptics';
import { clearLog, readLog, recentLines } from '@/lib/error-log';

/**
 * Settings rows that get the error log off the phone.
 *
 * Shares the log's *text* rather than attaching the file. React Native's
 * `Share` takes a `url` only on iOS; on Android it is `message` only, and a
 * `file://` URL would need a FileProvider to become something the receiver can
 * open. Text works on both with no extra dependency and no native rebuild —
 * and the log is written to disk as a file regardless, so `adb pull` reaches it
 * whenever a device is attached.
 *
 * The clipboard is the fallback, not a nicety: a release build has no console,
 * so these rows are the only way a crash report leaves the device, and `Share`
 * is one more thing that can be unavailable.
 *
 * An empty log says so rather than doing nothing — "no errors recorded" is
 * itself an answer when someone reports a crash that never reached a handler.
 */
export function ErrorLogRows({ styles }: { styles: ErrorLogStyles }) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    tapHaptic();
    const text = recentLines(readLog());
    try {
      if (!text) {
        Alert.alert('No errors recorded', 'The log is empty.');
        return;
      }
      await Share.share({ message: text, title: 'waku-errors.log' });
    } catch (cause) {
      // Dismissing the share sheet is not a failure worth reporting.
      if (cause instanceof Error && /cancel/i.test(cause.message)) return;
      try {
        await Clipboard.setStringAsync(text);
        Alert.alert('Copied', 'Sharing was unavailable, so the log is on the clipboard.');
      } catch {
        Alert.alert('Could not read the log', String(cause));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>Diagnostics</Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <AppPressable
          accessibilityHint="Opens the share sheet"
          accessibilityLabel="Send error log"
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void send()}
          style={({ pressed }) => [
            styles.row,
            pressed ? { backgroundColor: theme.surfaceMuted } : null,
          ]}
        >
          <Text style={[styles.rowLabel, { color: theme.text }]}>
            {busy ? 'Preparing…' : 'Send error log'}
          </Text>
        </AppPressable>
        <AppPressable
          accessibilityLabel="Clear error log"
          accessibilityRole="button"
          onPress={() => {
            tapHaptic();
            clearLog();
            Alert.alert('Cleared', 'The error log is empty.');
          }}
          style={({ pressed }) => [
            styles.row,
            pressed ? { backgroundColor: theme.surfaceMuted } : null,
          ]}
        >
          <Text style={[styles.rowLabel, { color: theme.text }]}>Clear error log</Text>
        </AppPressable>
      </View>
      <Text style={[styles.footer, { color: theme.textTertiary }]}>
        Errors are written to a file as they happen, so they survive a restart.
      </Text>
    </>
  );
}

/**
 * The settings screen's own style keys, passed in rather than restated.
 *
 * These rows sit inside that screen's existing cards and must match the rows
 * around them; copying the metrics here would let the two drift the moment
 * either changed.
 */
export interface ErrorLogStyles {
  card: StyleProp<ViewStyle>;
  footer: StyleProp<TextStyle>;
  row: StyleProp<ViewStyle>;
  rowLabel: StyleProp<TextStyle>;
  sectionTitle: StyleProp<TextStyle>;
}
