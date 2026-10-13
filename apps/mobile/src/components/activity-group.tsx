import type { ActivityItem, TranscriptBlock } from '@waku/client';
import { activitiesForBlock } from '@waku/client/event-reducer';
import { activityHeaderTitle } from '@waku/client/transcript-presentation';
import { Reasoning } from 'panelui-native/components/reasoning';
import { Task } from 'panelui-native/components/task';
import type { TaskStatus } from 'panelui-native/components/task';
import { memo } from 'react';

import { ActivityDetail } from './activity-detail';

/**
 * A tool group in the transcript, as a PanelUI `Task` — with the model's
 * reasoning lifted out of it into its own `Reasoning`.
 *
 * Reasoning is not a step the agent took; it is the thinking that produced the
 * steps, and PanelUI ships a component for exactly that distinction. It used to
 * render as an `ActivityDetail` nested inside this group's `Task`, which put
 * two independently animating bodies on the same row: the trace grows token by
 * token while the group's `Task.Trigger` shimmers its title for as long as the
 * turn runs. Two animations on one row is what made the header read as empty
 * while a turn was live and correct itself the moment it finished.
 *
 * Split, each owns a single animation. `Reasoning` opens itself while the trace
 * arrives and folds away a beat after it stops — and, because its own trigger
 * carries the shimmer, the group's title is no longer competing with it. The
 * `Task` keeps the steps, which are the record and stay open.
 *
 * Reasoning renders first because it precedes the action it produced.
 */
const ACTIVITY_WINDOW = 8;

export const ActivityGroup = memo(function ActivityGroup({
  block,
  live,
}: {
  block: TranscriptBlock;
  live: boolean;
}) {
  const activities = activitiesForBlock(block);
  if (!activities.length) return null;

  const reasoning = activities.filter((activity) => activity.reasoning);
  const steps = activities.filter((activity) => !activity.reasoning);

  return (
    <>
      {reasoning.length > 0 && (
        <Reasoning isStreaming={live && reasoning.some((activity) => !activity.complete)}>
          <Reasoning.Trigger />
          <Reasoning.Content>{reasoningTrace(reasoning)}</Reasoning.Content>
        </Reasoning>
      )}
      {steps.length > 0 && <StepGroup activities={steps} live={live} />}
    </>
  );
});

/**
 * The joined trace of every reasoning item in the group.
 *
 * Joined rather than one component each: a provider can emit a run of separate
 * reasoning parts for a single thought, and one panel per part is a column of
 * "Thinking…" rows.
 */
function reasoningTrace(reasoning: readonly ActivityItem[]): string {
  return reasoning
    .map((activity) => activity.reasoning?.content.trim() ?? '')
    .filter(Boolean)
    .join('\n\n');
}

/**
 * The steps, as a PanelUI `Task`.
 *
 * Tapping expands it in place, like `Reasoning`, `Plan` and background work —
 * the sheet this used to open made the command group the one drill-down in an
 * otherwise inline transcript. The list is windowed the way `TodoStrip`
 * windows a long plan: a settled group can hold a hundred commands, and an
 * inverted, anchored list must not absorb all of them on a tap. The rows
 * around the live one are the ones worth showing; the rest is a count.
 */
function StepGroup({ activities, live }: { activities: ActivityItem[]; live: boolean }) {
  const activeIndex = activities.findIndex((activity) => !activity.complete);
  const anchor = activeIndex === -1 ? activities.length - 1 : activeIndex;
  const start = Math.max(0, Math.min(
    anchor - Math.floor(ACTIVITY_WINDOW / 2),
    activities.length - ACTIVITY_WINDOW,
  ));
  const visible = activities.slice(start, start + ACTIVITY_WINDOW);
  const hiddenBefore = start;
  const hiddenAfter = activities.length - start - visible.length;
  const anyFailed = activities.some((activity) => activity.failed);
  const allComplete = activities.every((activity) => activity.complete);

  const status: TaskStatus = live && !allComplete
    ? 'running'
    : anyFailed ? 'error' : 'complete';

  return (
    <Task
      className="min-h-7"
      defaultOpen={Boolean(activeIndex !== -1)}
      status={status}
    >
      <Task.Trigger title={activityHeaderTitle(activities, live)} />
      <Task.Content>
        {hiddenBefore > 0 ? (
          <Task.Item>{`${hiddenBefore} earlier`}</Task.Item>
        ) : null}
        {visible.map((activity) => (
          // One disclosure per command, inside the group's own — the same
          // gesture at both levels, and the detail stays in the transcript
          // rather than replacing it.
          <ActivityDetail activity={activity} key={activity.id} />
        ))}
        {hiddenAfter > 0 ? (
          <Task.Item>{`${hiddenAfter} more`}</Task.Item>
        ) : null}
      </Task.Content>
    </Task>
  );
}
