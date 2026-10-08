import type {
  BackgroundWorkItem,
  ComputerUseState,
  TodoItem,
} from '@waku/client';
import { memo, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppSymbol } from '@/components/app-symbol';
import { AppPressable } from '@/components/app-pressable';
import { useTheme } from '@/hooks/use-theme';
import { type Theme } from '@/constants/theme';
import { useRuntime } from '@/lib/runtime-context';
import {
  todoProgress,
  visibleTodoWindow,
} from '@/lib/todo-strip';

/**
 * The agent's own task list, mirrored from the harness's `todoUpdated`
 * stream — the desktop's task-list panel, sized for a phone. Sits above
 * the composer, so what the agent intends and where it stands is visible
 * without scrolling into the transcript.
 *
 * A plan longer than {@link TODO_STRIP_LIMIT} windows around the step being
 * worked on rather than rendering every row: a twenty-task plan would
 * otherwise push the composer off screen, and the rows that matter are the
 * current one and its neighbours.
 */
export const TodoStrip = memo(function TodoStrip({ todos }: { todos: TodoItem[] }) {
  const theme = useTheme();
  // Fold state is per mounted strip, and the caller keys the strip by session,
  // so switching tasks starts each plan expanded. Mirrors the desktop tray's
  // `todo_tray_collapsed`, which is likewise session-scoped and kept in memory.
  const [collapsed, setCollapsed] = useState(false);
  if (!todos.length) return null;
  const [done, total] = todoProgress(todos);
  const { start, end, hiddenBefore, hiddenAfter } = visibleTodoWindow(todos);
  const visible = todos.slice(start, end);
  return (
    <View style={[styles.todoCard, { backgroundColor: theme.raised }]}>
      <AppPressable
        accessibilityLabel={`Tasks, ${done} of ${total} done`}
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        hitSlop={6}
        onPress={() => setCollapsed((value) => !value)}
        style={({ pressed }) => [
          styles.todoHeader,
          !collapsed && styles.todoHeaderExpanded,
          { opacity: pressed ? 0.6 : 1 },
        ]}>
        <AppSymbol
          name={
            collapsed
              ? { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }
              : { ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }
          }
          size={13}
          tintColor={theme.textTertiary}
        />
        <Text style={[styles.todoTitle, { color: theme.textTertiary }]}>Tasks</Text>
        <Text style={[styles.todoCount, { color: theme.textTertiary }]}>
          {done}/{total}
        </Text>
      </AppPressable>
      {!collapsed && (
        <>
          {hiddenBefore > 0 ? (
            <TodoOverflowRow label={`${hiddenBefore} earlier`} theme={theme} />
          ) : null}
          {visible.map((todo) => (
            <View key={todo.content} style={styles.todoRow}>
              <AppSymbol
                name={
                  todo.status === 'completed'
                    ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
                    : todo.status === 'in_progress'
                      ? { ios: 'circle.dashed', android: 'adjust', web: 'adjust' }
                      : todo.status === 'cancelled'
                        ? { ios: 'xmark.circle', android: 'cancel', web: 'cancel' }
                        : { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' }
                }
                size={13}
                tintColor={
                  todo.status === 'completed'
                    ? theme.success
                    : todo.status === 'in_progress'
                      ? theme.accent
                      : theme.textTertiary
                }
              />
              <Text
                numberOfLines={2}
                style={[
                  styles.todoText,
                  {
                    color: todo.status === 'cancelled' ? theme.textTertiary : theme.text,
                    textDecorationLine: todo.status === 'completed' ? 'line-through' : 'none',
                  },
                ]}>
                {todo.content}
              </Text>
            </View>
          ))}
          {hiddenAfter > 0 ? (
            <TodoOverflowRow label={`${hiddenAfter} later`} theme={theme} />
          ) : null}
        </>
      )}
    </View>
  );
});

/**
 * The `N earlier` / `N later` edge row that marks hidden entries, so a windowed
 * plan never reads as the whole plan.
 */
const TodoOverflowRow = memo(function TodoOverflowRow({
  label,
  theme,
}: {
  label: string;
  theme: Theme;
}) {
  return (
    <View style={styles.todoRow}>
      <AppSymbol
        name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
        size={13}
        tintColor={theme.textTertiary}
      />
      <Text numberOfLines={1} style={[styles.todoText, { color: theme.textTertiary }]}>
        {label}
      </Text>
    </View>
  );
});

/** Status → glyph color: running harness work reads as active, not alarmed. */
function workStatusColor(theme: Theme, status: BackgroundWorkItem['status']): string {
  switch (status) {
    case 'running':
    case 'monitoring':
      return theme.accent;
    case 'stopping':
      return theme.warning;
    case 'failed':
      return theme.danger;
    default:
      return theme.textTertiary;
  }
}

/**
 * Harness background work: subagents, detached processes, monitors. A single
 * summary line while anything is live; tapping opens the detail sheet with
 * per-item status and a Stop control where the provider allows one.
 */
export const BackgroundWorkBar = memo(function BackgroundWorkBar({
  sessionId,
  items,
}: {
  sessionId: string;
  items: BackgroundWorkItem[];
}) {
  const theme = useTheme();
  const runtime = useRuntime();
  const [openItem, setOpenItem] = useState<BackgroundWorkItem | null>(null);
  const live = items.filter(
    (item) => item.status === 'running' || item.status === 'monitoring' || item.status === 'stopping',
  );
  if (!items.length) return null;

  const summary = live.length
    ? `${live.length} running in background`
    : `${items.length} finished`;
  const openSheet = useCallback((item: BackgroundWorkItem) => setOpenItem(item), []);

  return (
    <>
      <AppPressable
        accessibilityLabel="Background tasks"
        accessibilityRole="button"
        onPress={() => setOpenItem(live[0] ?? items[0] ?? null)}
        style={({ pressed }) => [
          styles.workBar,
          { backgroundColor: theme.raised, opacity: pressed ? 0.7 : 1 },
        ]}>
        <AppSymbol
          name={{ ios: 'square.stack.3d.up', android: 'layers', web: 'layers' }}
          size={13}
          tintColor={theme.textTertiary}
        />
        <Text numberOfLines={1} style={[styles.workBarText, { color: theme.textSecondary }]}>
          {summary}
        </Text>
        <AppSymbol
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={11}
          tintColor={theme.textTertiary}
        />
      </AppPressable>
      <BackgroundWorkSheet
        sessionId={sessionId}
        items={items}
        openItem={openItem}
        onClose={() => setOpenItem(null)}
        onSelect={openSheet}
      />
    </>
  );
});

function BackgroundWorkSheet({
  sessionId,
  items,
  openItem,
  onClose,
  onSelect,
}: {
  sessionId: string;
  items: BackgroundWorkItem[];
  openItem: BackgroundWorkItem | null;
  onClose: () => void;
  onSelect: (item: BackgroundWorkItem) => void;
}) {
  const theme = useTheme();
  const runtime = useRuntime();
  const [stopping, setStopping] = useState<string | null>(null);

  const stop = useCallback(
    (item: BackgroundWorkItem) => {
      setStopping(item.key.providerId);
      runtime
        .stopBackgroundWork(sessionId, item.key)
        .catch(() => {})
        .finally(() => setStopping(null));
    },
    [runtime, sessionId],
  );

  if (!openItem) return null;
  const live = items.filter(
    (item) => item.status === 'running' || item.status === 'monitoring' || item.status === 'stopping',
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dim behind the sheet; tap to close. */}
      <AppPressable
        accessibilityLabel="Close background tasks"
        onPress={onClose}
        style={styles.sheetBackdrop}
      />
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Background tasks</Text>
          <AppPressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onClose}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <AppSymbol
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              size={15}
              tintColor={theme.textSecondary}
            />
          </AppPressable>
        </View>
        <ScrollView style={styles.sheetList}>
          <View style={styles.workTabs}>
            {live.length > 0 && items.filter((item) => !live.includes(item)).length > 0 && (
              <Text style={[styles.sheetSection, { color: theme.textTertiary }]}>Running</Text>
            )}
          </View>
          {items.map((item) => (
            <View
              key={`${item.key.kind}:${item.key.providerId}`}
              style={[styles.workCard, { backgroundColor: theme.raised }]}>
              <AppPressable onPress={() => onSelect(item)}>
                <View style={styles.workCardHeader}>
                  <AppSymbol
                    name={{ ios: 'circle.fill', android: 'circle', web: 'circle' }}
                    size={9}
                    tintColor={workStatusColor(theme, item.status)}
                  />
                  <Text
                    numberOfLines={1}
                    style={[styles.workCardTitle, { color: theme.text }]}
                  >
                    {item.title || item.key.providerId}
                  </Text>
                  <Text style={[styles.workCardStatus, { color: workStatusColor(theme, item.status) }]}>
                    {item.status}
                  </Text>
                </View>
                {item.detail ? (
                  <Text numberOfLines={2} style={[styles.workCardDetail, { color: theme.textSecondary }]}>
                    {item.detail}
                  </Text>
                ) : null}
              </AppPressable>
              {item.canStop && item.status !== 'stopping' && (
                <View style={styles.workCardFooter}>
                  <AppPressable
                    accessibilityLabel={`Stop ${item.title || item.key.providerId}`}
                    accessibilityRole="button"
                    disabled={stopping === item.key.providerId}
                    onPress={() => stop(item)}
                    style={({ pressed }) => ({ opacity: pressed || stopping === item.key.providerId ? 0.5 : 1 })}>
                    <Text style={[styles.workStopText, { color: theme.danger }]}>Stop</Text>
                  </AppPressable>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

/** The agent is driving the host's screen: a compact live indicator with
 *  the target app and window, and the phase as color (running = accent,
 *  awaiting approval = warning, failed = danger). */
export const ComputerUseChip = memo(function ComputerUseChip({
  state,
}: {
  state: ComputerUseState;
}) {
  const theme = useTheme();
  const phaseColor =
    state.phase === 'failed'
      ? theme.danger
      : state.phase === 'awaitingApproval'
        ? theme.warning
        : theme.accent;
  const label =
    state.phase === 'awaitingApproval'
      ? 'Computer use — waiting for approval'
      : state.phase === 'failed'
        ? 'Computer use failed'
        : `Controlling ${state.target?.appName ?? 'the host screen'}`;
  return (
    <View style={[styles.computerChip, { backgroundColor: theme.raised }]}>
      <View style={[styles.computerDot, { backgroundColor: phaseColor }]} />
      <Text numberOfLines={1} style={[styles.computerText, { color: theme.textSecondary }]}>
        {label}
        {state.target?.windowTitle ? ` · ${state.target.windowTitle}` : ''}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  computerChip: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 7,
    marginBottom: 8,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  computerDot: { borderRadius: 5, height: 10, width: 10 },
  computerText: { flex: 1, fontSize: 12.5 },
  todoCard: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  todoHeader: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  // Only the expanded header owns the gap to its rows; collapsed, the header
  // is the whole card and the margin would read as stray padding.
  todoHeaderExpanded: { marginBottom: 6 },
  todoTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  todoCount: { fontSize: 11, fontVariant: ['tabular-nums'], marginLeft: 'auto' },
  todoRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, paddingVertical: 3 },
  todoText: { flex: 1, fontSize: 13.5, lineHeight: 18 },
  workBar: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 7,
    marginBottom: 8,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  workBarText: { flex: 1, fontSize: 13 },
  sheetBackdrop: { backgroundColor: 'rgba(0,0,0,0.45)', flex: 1 },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '80%',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700' },
  sheetList: { marginBottom: 20 },
  sheetSection: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  workTabs: { minHeight: 0 },
  workCard: { borderRadius: 12, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 10 },
  workCardHeader: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  workCardTitle: { flex: 1, fontSize: 14, fontWeight: '600' },
  workCardStatus: { fontSize: 11.5, fontWeight: '600' },
  workCardDetail: { fontSize: 12.5, lineHeight: 17, marginTop: 4 },
  workCardFooter: { alignItems: 'flex-end', marginTop: 6 },
  workStopText: { fontSize: 13, fontWeight: '700' },
});
