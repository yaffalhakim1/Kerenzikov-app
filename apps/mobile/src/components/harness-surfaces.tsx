import type {
  BackgroundWorkItem,
  ComputerUseState,
  TodoItem,
} from '@waku/client';
import { Plan } from 'panelui-native/components/plan';
import type { PlanStepStatus } from 'panelui-native/components/plan';
import { Badge } from 'panelui-native/components/badge';
import { Button } from 'panelui-native/components/button';
import { Collapsible } from 'panelui-native/components/collapsible';
import { Frame } from 'panelui-native/components/frame';
import { Item } from 'panelui-native/components/item';
import { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

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
  // Fold state is per mounted strip, and the caller keys the strip by session.
  // Starts collapsed: the strip sits above the composer, and a plan of any
  // length expanded is a plan the reader cannot see the conversation past. The
  // header carries the progress count, so the state is still legible closed.
  const [collapsed, setCollapsed] = useState(true);
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
    // `shadow-none`: `Plan`'s root carries `shadow-sm`, and this app's surfaces
    // are flat with hairline borders — the same override the composer takes.
    <Plan
      className="mb-2 shadow-none"
      defaultOpen={!collapsed}
      onOpenChange={(open) => setCollapsed(!open)}
    >
      <Plan.Header className="items-center p-3">
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
          {/* `Plan.Trigger` is the fold control, and its slot is a 32pt circle
              built to hold a chevron — wrapping the header in it would crush
              the row into that circle. So it sits in the action slot, where it
              belongs, and the header keeps its own layout. */}
          <Plan.Trigger />
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
/** Harness status → the `Badge` tone that carries it. Colour is never the only
 *  signal: the label below says the same thing in a word. */
const STATUS_BADGE = {
  completed: 'success',
  failed: 'destructive',
  lost: 'destructive',
  monitoring: 'info',
  running: 'info',
  starting: 'secondary',
  stopped: 'secondary',
  stopping: 'secondary',
} as const satisfies Record<BackgroundWorkItem['status'], string>;

/** One word per status, for the badge. `monitoring` is a live watch rather than
 *  a finished step, and "watching" says that where "running" would not. */
const STATUS_LABEL = {
  completed: 'done',
  failed: 'failed',
  lost: 'lost',
  monitoring: 'watching',
  running: 'running',
  starting: 'starting',
  stopped: 'stopped',
  stopping: 'stopping',
} as const satisfies Record<BackgroundWorkItem['status'], string>;

/** A glyph per kind of work, so a process, a monitor and a subagent are
 *  distinguishable before the title is read. */
const WORK_ICONS = {
  monitor: { ios: 'eye', android: 'visibility', web: 'visibility' },
  process: { ios: 'terminal', android: 'terminal', web: 'terminal' },
  subagent: { ios: 'person.2', android: 'group', web: 'group' },
} as const satisfies Record<BackgroundWorkItem['key']['kind'], unknown>;

function workTint(theme: Theme, status: BackgroundWorkItem['status']): string {
  switch (status) {
    case 'failed':
    case 'lost':
      return theme.danger;
    case 'completed':
      return theme.success;
    case 'running':
    case 'monitoring':
      return theme.accent;
    default:
      return theme.textTertiary;
  }
}

function isLiveWork(status: BackgroundWorkItem['status']): boolean {
  return status === 'running' || status === 'monitoring' || status === 'stopping';
}

/**
 * Harness background work: subagents, detached processes, monitors.
 *
 * A `Collapsible` shell holding `Frame` rows.
 *
 * `Frame` is the row anatomy — its own docs build it for an "Agent monitor",
 * and a `Frame.Row` is one job: kind glyph, title, a status line, and the status
 * as a tinted `Badge` in the trailing slot. It also gets the row dividers and
 * the shrink contract (a long title truncates instead of pushing the badge off
 * the edge) without any of that being re-derived here.
 *
 * `Frame` has no disclosure of its own, and this surface sits above the
 * composer, so an expanded list is a list the reader cannot see past. The
 * `Collapsible` is the fold: one header row — the summary, the live/done badge
 * and a rotating chevron — over a body that keeps its rows mounted while
 * closed. Starts closed, like the task strip above it: the surface sits over
 * the composer, and the header already carries the count and the status.
 *
 * The previous version nested a `Task` per item inside a `Task`, which gave
 * every job its own chevron — two levels of disclosure for one flat list, the
 * inner ones opening onto unlabelled `Task.Item` strings.
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
    <Collapsible
      className="mb-2"
      variant="surface"
    >
      <Collapsible.Trigger>
        <Collapsible.Title>{summary}</Collapsible.Title>
        <Badge size="xs" variant={live.length ? 'info' : 'success'}>
          {live.length ? 'live' : 'done'}
        </Badge>
        <Collapsible.Indicator />
      </Collapsible.Trigger>
      {/*
        The rows are full-bleed inside the trigger's padding, so a row's own
        divider runs the width of the card the way a table's does. `px-0 pb-0`
        cancels the surface variant's inset, which the rows carry themselves.
      */}
      <Collapsible.Content className="px-0 pb-0">
        {items.map((item, index) => (
          <Frame.Row
            align={item.detail || item.command ? 'start' : 'center'}
            divided={index > 0}
            key={`${item.key.kind}:${item.key.providerId}`}
          >
            <Frame.Media>
              <AppSymbol
                name={WORK_ICONS[item.key.kind]}
                size={16}
                tintColor={workTint(theme, item.status)}
              />
            </Frame.Media>
            <Frame.Content>
              <Frame.Title>{item.title || item.key.providerId}</Frame.Title>
              <Frame.Description>
                {[item.detail, item.command, item.cwd].filter(Boolean).join(' · ')}
              </Frame.Description>
            </Frame.Content>
            <Frame.Actions>
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
              <Badge size="xs" variant={STATUS_BADGE[item.status]}>
                {STATUS_LABEL[item.status]}
              </Badge>
            </Frame.Actions>
          </Frame.Row>
        ))}
      </Collapsible.Content>
    </Collapsible>
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
    <Item className="mb-2" size="xs">
      <Item.Media>
        <View style={[styles.computerDot, { backgroundColor: phaseColor }]} />
      </Item.Media>
      <Item.Content>
        <Item.Title numberOfLines={1} className="text-xs text-secondary-foreground">
          {label}
          {state.target?.windowTitle ? ` · ${state.target.windowTitle}` : ''}
        </Item.Title>
      </Item.Content>
    </Item>
  );
});

const styles = StyleSheet.create({
  computerDot: { borderRadius: 5, height: 10, width: 10 },
});
