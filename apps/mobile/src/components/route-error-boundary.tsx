import { Alert } from 'panelui-native/components/alert';
import { Button } from 'panelui-native/components/button';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { recordError, flushNow, readLog, recentLines } from '@/lib/error-log';
import { useTheme } from '@/hooks/use-theme';

/**
 * What a route renders when its own screen throws.
 *
 * Without this, a render error in a screen unmounts the whole tree — which is
 * what "the session page threw itself out" is: not the process dying, but React
 * tearing down everything below the point that failed. Expo Router calls this
 * component instead, so the rest of the app survives and the error becomes
 * something that can be read rather than something that vanishes.
 *
 * It does two jobs, and the second is the one that matters here:
 *
 * 1. Keep the screen usable — the message, a way to retry.
 * 2. **Write the error down before it can be lost.** The log is on disk, so it
 *    survives a relaunch, and the last section of this screen shows it. A
 *    release build has no console, so without this the only copy of the stack
 *    is the screen itself, which is gone the moment it is dismissed.
 *
 * ## Why this is a class
 *
 * `componentDidCatch` is the only place React hands over both the error and its
 * `componentStack` — which is the part that says *which* component threw, and
 * is what makes a report actionable. It also fires exactly once per error, so
 * the entry cannot be written twice by a double render. A hook cannot do this,
 * so the catching stays a class and the presentation is split into the
 * function below, which can.
 */
export class ErrorBoundary extends Component<{
  error: Error;
  retry: () => Promise<void>;
  children?: ReactNode;
}> {
  componentDidCatch(error: Error, info: ErrorInfo): void {
    recordError(error, {
      scope: 'ErrorBoundary',
      componentStack: info.componentStack ?? undefined,
    });
    // Written through immediately rather than left on the flush timer: this
    // runs on the way to a screen the reader may dismiss, or kill the app
    // from, before a queued write would have landed.
    flushNow();
  }

  render(): ReactNode {
    return (
      <ErrorFallback error={this.props.error} retry={this.props.retry} />
    );
  }
}

function ErrorFallback({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  const theme = useTheme();
  const log = recentLines(readLog());

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/*
          PanelUI's own status message rather than a hand-built card: it brings
          the destructive tone and the matching indicator icon, so the fallback
          cannot end up with a warning icon on an error.
        */}
        <Alert variant="destructive">
          <Alert.Content>
            <Alert.Title>This screen stopped</Alert.Title>
            <Alert.Description>
              The rest of the app is still running. The error is in the log
              below.
            </Alert.Description>
          </Alert.Content>
        </Alert>

        <Text selectable style={[styles.message, { color: theme.text }]}>
          {error.name}: {error.message}
        </Text>

        <View style={styles.actions}>
          <Button onPress={() => void retry()} size="sm" variant="primary">
            Try again
          </Button>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>
          {log.length > 0 ? 'LOG · on disk, survives a restart' : 'LOG · empty'}
        </Text>
        {/*
          Selectable rather than behind a copy button: the point is to get this
          text off the phone, and long-press-to-copy still works if the
          clipboard is among the things that broke.
        */}
        <Text selectable style={[styles.log, { color: theme.textSecondary }]}>
          {log.length > 0 ? log : 'Nothing recorded yet.'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  content: { gap: 10, padding: 16, paddingBottom: 40 },
  log: { fontFamily: 'monospace', fontSize: 11, lineHeight: 16 },
  message: { fontSize: 13, lineHeight: 19 },
  screen: { flex: 1 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginTop: 8 },
});
