import type {
  BackgroundWorkItem,
  ComputerUseState,
  TodoItem,
} from '@waku/client';
import { Plan } from 'panelui-native/components/plan';
import type { PlanStepStatus } from 'panelui-native/components/plan';
import { Button } from 'panelui-native/components/button';
import { Task } from 'panelui-native/components/task';
import type { TaskStatus } from 'panelui-native/components/task';
import { memo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppSymbol } from '@/components/app-symbol';
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
  const todoStatus = (todo: TodoItem): PlanStepStatus =>
    todo.status === 'completed'
      ? 'done'
      : todo.status === 'in_progress'
        ? 'active'
        : todo.status === 'cancelled' ? 'skipped' : 'pending';
  return (
    <Plan defaultOpen={!collapsed} onOpenChange={(open) => setCollapsed(!open)}>
      <Plan.Header>
        <Plan.Icon>
          <AppSymbol
            name={{ ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' }}
            size={15}
            tintColor={theme.textTertiary}
          />
        </Plan.Icon>
        <Plan.Title>Tasks</Plan.Title>
        <Plan.Action>
          <Plan.Progress value={done} total={total} />
        </Plan.Action>
      </Plan.Header>
      <Plan.Content>
        <Plan.Steps>
          {hiddenBefore > 0 ? (
            <Plan.Step key="before" status="skipped">
              {`${hiddenBefore} earlier`}
            </Plan.Step>
          ) : null}
          {visible.map((todo) => (
            <Plan.Step key={todo.content} status={todoStatus(todo)}>
              {todo.content}
            </Plan.Step>
          ))}
          {hiddenAfter > 0 ? (
            <Plan.Step key="after" status="skipped">
              {`${hiddenAfter} later`}
            </Plan.Step>
          ) : null}
        </Plan.Steps>
      </Plan.Content>
    </Plan>
  );
});
/** Harness status → PanelUI `Task`'s four states. `monitoring` is a live
 *  watch rather than a finished step, so it reads as running. */
function taskStatus(status: BackgroundWorkItem['status']): TaskStatus {
  switch (status) {
    case 'running':
    case 'monitoring':
      return 'running';
    case 'starting':
    case 'stopping':
      return 'pending';
    case 'failed':
    case 'lost':
      return 'error';
    default:
      return 'complete';
  }
}

function isLiveWork(status: BackgroundWorkItem['status']): boolean {
  return status === 'running' || status === 'monitoring' || status === 'stopping';
}

/**
 * Harness background work: subagents, detached processes, monitors.
 *
 * A PanelUI `Task` whose trigger is the summary line — status glyph, title and
 * the count that follows it — and whose content is one `Task.Item` per item
 * with its live Stop where the provider allows one. The Task is its own
 * disclosure, so the list opens in place instead of in a sheet over the
 * transcript: the work is part of what the turn is doing, and a sheet made the
 * reader lose the transcript to look at it.
 *
 * `Task`'s status drives the leading glyph and shimmers the title while work is
 * live, which is the same signal the row used to draw by hand.
 */
export const BackgroundWorkBar = memo(function BackgroundWorkBar({
  sessionId,
  items,
}: {
  sessionId: string;
  items: BackgroundWorkItem[];
}) {
  const runtime = useRuntime();
  const [stopping, setStopping] = useState<string | null>(null);
  const live = items.filter((item) => isLiveWork(item.status));
  if (!items.length) return null;

  const summary = live.length
    ? `${live.length} running in background`
    : `${items.length} finished`;

  const stop = (item: BackgroundWorkItem) => {
    setStopping(item.key.providerId);
    runtime
      .stopBackgroundWork(sessionId, item.key)
      .catch(() => {})
      .finally(() => setStopping(null));
  };

  return (
    <Task
      className="mb-2"
      status={live.length ? 'running' : 'complete'}
    >
      <Task.Trigger title={summary} />
      <Task.Content>
        {items.map((item) => (
          <Task.Item key={`${item.key.kind}:${item.key.providerId}`}>
            {item.title || item.key.providerId}
            {`  ${item.status}`}
            {item.canStop && item.status !== 'stopping' ? (
              <Button
                accessibilityLabel={`Stop ${item.title || item.key.providerId}`}
                disabled={stopping === item.key.providerId}
                onPress={() => stop(item)}
                size="xs"
                variant="ghost"
              >
                Stop
              </Button>
            ) : null}
          </Task.Item>
        ))}
      </Task.Content>
    </Task>
  );
});

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
});
