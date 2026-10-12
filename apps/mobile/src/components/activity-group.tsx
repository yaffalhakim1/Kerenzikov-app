import type { TranscriptBlock } from '@waku/client';
import { activitiesForBlock } from '@waku/client/event-reducer';
import { activityHeaderTitle } from '@waku/client/transcript-presentation';
import { Task } from 'panelui-native/components/task';
import type { TaskStatus } from 'panelui-native/components/task';
import { memo } from 'react';

import { ActivityDetail } from './activity-detail';

/**
 * A tool group in the transcript, as a PanelUI `Task`.
 *
 * Tapping expands it in place, like `Reasoning`, `Plan` and background work —
 * the sheet this used to open made the command group the one drill-down in an
 * otherwise inline transcript. The list is windowed the way `TodoStrip`
 * windows a long plan: a settled group can hold a hundred commands, and an
 * inverted, anchored list must not absorb all of them on a tap. The rows
 * around the live one are the ones worth showing; the rest is a count.
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
});
