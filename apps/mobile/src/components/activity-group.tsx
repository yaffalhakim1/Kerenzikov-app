import type { ActivityItem, TranscriptBlock } from '@waku/client';
import { activitiesForBlock } from '@waku/client/event-reducer';
import {
  activityFileChangeStats,
  activityHeaderTitle,
} from '@waku/client/transcript-presentation';
import { BottomSheet } from 'panelui-native/components/bottom-sheet';
import { Item } from 'panelui-native/components/item';
import { Reasoning } from 'panelui-native/components/reasoning';
import { memo, useState } from 'react';

import { ACTIVITY_ICONS } from './activity-icons';
import { ActivityDetail } from './activity-detail';
import { AppSymbol } from './app-symbol';

import { useTheme } from '@/hooks/use-theme';

/**
 * A tool group in the transcript.
 *
 * The transcript carries the *record* of what happened — "Ran 12 commands, 1
 * failed" — and the commands themselves, with their output, open in a sheet.
 *
 * This is the shape ChatGPT's and Claude's mobile clients use, and it is the
 * one that survives a real session. A group can hold a hundred commands and
 * each can carry tens of kilobytes of output; inline, that is either a
 * thousand collapsed rows to scroll past, or — before this — a step's whole
 * body built whether or not it was ever read. One measured session had 390
 * groups and 977 activities, and building their bodies inline cost 743 views
 * in a single commit, which is what stalled the screen and ANR'd the app.
 *
 * The summary stays inline because that is the part you scroll back for. The
 * detail leaves because it is the part you open *when something went wrong*,
 * which is PanelUI's own description of a task body: "the header is the step;
 * the body is the detail nobody reads unless something went wrong."
 *
 * This is a different call from `a78c7f1`, which moved the sheet inline. That
 * one was right about what it fixed — the sheet was the only drill-down in an
 * otherwise inline transcript, and its host was `@expo/ui`, the last non-PanelUI
 * surface on the page. Both of those are answered here: `Reasoning`, `Plan` and
 * background work still expand in place, and the sheet is PanelUI's.
 *
 * Reasoning renders first because it precedes the action it produced.
 */
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
 * The group's row in the transcript, and the sheet its commands live in.
 *
 * The row is one line however much the group did, and pressing it opens the
 * sheet. It is an `Item` rather than a `Task.Trigger` because there is no body
 * to fold: a `Task` trigger carries a chevron that turns as its body opens, and
 * a chevron that turns while nothing unfolds underneath it is a lie about what
 * the tap did.
 *
 * The sheet is hosted here, one per group, rather than at the session level.
 * That is deliberate and it is what keeps the code honest: `BottomSheet.Content`
 * returns `null` until it is first presented, so a closed sheet costs nothing,
 * and a group's own sheet can hold its own `activities` instead of the session
 * having to locate the block again on every stream commit. Every commit
 * deep-clones the session, so a session-level sheet would need exactly the
 * locator that `a78c7f1` was glad to delete.
 */
function StepGroup({ activities, live }: { activities: ActivityItem[]; live: boolean }) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();

  const title = activityHeaderTitle(activities, live);
  const failed = activities.filter((activity) => activity.failed).length;
  const summary = summaryLine(activities);

  /*
   * One line in the transcript, however much the group did.
   *
   * The failure is appended to the title rather than given a line of its own:
   * a group that failed is the one case worth seeing without opening anything,
   * and a second line per group doubles the height of a transcript that is
   * mostly groups. The sheet's header carries the full breakdown.
   */
  const rowTitle = failed > 0 ? `${title} · ${failed} failed` : title;

  return (
    <BottomSheet open={open} onOpenChange={setOpen}>
      <BottomSheet.Trigger>
        <Item className="min-h-7">
          <Item.Media>
            <AppSymbol
              name={ACTIVITY_ICONS[failed > 0 ? 'tool' : 'command']}
              size={15}
              tintColor={failed > 0 ? theme.danger : theme.textSecondary}
            />
          </Item.Media>
          <Item.Content>
            <Item.Title numberOfLines={1}>{rowTitle}</Item.Title>
          </Item.Content>
        </Item>
      </BottomSheet.Trigger>
      <BottomSheet.Content
        accessibilityLabel={`${title} — ${summary}`}
        size="full"
      >
        <BottomSheet.Header title={title} description={summary} />
        <BottomSheet.Body>
          {activities.map((activity) => (
            <ActivityDetail activity={activity} key={activity.id} />
          ))}
        </BottomSheet.Body>
      </BottomSheet.Content>
    </BottomSheet>
  );
}

/**
 * What the group did, in one line: how many steps, how many failed, and the
 * edit totals when the steps were edits.
 *
 * Summed across the group's own `activityFileChangeStats` rather than invented,
 * so the line cannot disagree with the per-step figures inside the sheet.
 */
function summaryLine(activities: readonly ActivityItem[]): string {
  const parts = [`${activities.length} ${activities.length === 1 ? 'step' : 'steps'}`];
  const failed = activities.filter((activity) => activity.failed).length;
  if (failed > 0) parts.push(`${failed} failed`);

  let additions = 0;
  let deletions = 0;
  let edited = false;
  for (const activity of activities) {
    const stats = activityFileChangeStats(activity);
    if (!stats) continue;
    edited = true;
    additions += stats.additions;
    deletions += stats.deletions;
  }
  if (edited) parts.push(`+${additions} −${deletions}`);

  return parts.join(' · ');
}
