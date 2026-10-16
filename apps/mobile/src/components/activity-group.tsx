import type { ActivityItem, TranscriptBlock } from '@waku/client';
import { activitiesForBlock } from '@waku/client/event-reducer';
import {
  activityFileChangeStats,
  activityHeaderTitle,
} from '@waku/client/transcript-presentation';
import { BottomSheet } from 'panelui-native/components/bottom-sheet';
import { Task } from 'panelui-native/components/task';
import { memo, useState } from 'react';

import { ActivityDetail } from './activity-detail';
import { ReasoningSheet } from './reasoning-sheet';

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
 * surface on the page. Both of those are answered here: `Plan` and background
 * work still expand in place, and every sheet is PanelUI's.
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
      {reasoning.length > 0 && <ReasoningSheet live={live} reasoning={reasoning} />}
      {steps.length > 0 && <StepGroup activities={steps} live={live} />}
    </>
  );
});

/**
 * The group's row in the transcript, and the sheet its commands live in.
 *
 * The row is one line however much the group did, and pressing it opens the
 * sheet. The row itself is `Task.Trigger`, because that is the component that
 * knows what a step looks like — the status glyph, the transcript's type, the
 * shimmer while it runs. It is not paired with a `Task.Content`: the body is
 * the sheet, so the chevron reads as "this opens" rather than as a fold, and
 * the row is wrapped in `BottomSheet.Trigger` to make the tap open the sheet.
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
      {/*
        The row is PanelUI's `Task.Trigger`, not a hand-rolled `Item`.
        `Task.Trigger` is what carries the step's own vocabulary: the status
        glyph on the left, the title in the transcript's type, the shimmer while
        the step is still running, and the chevron that says the row opens
        something. Rebuilding the row out of an `Item` reproduced the text and
        nothing else, so a running step looked exactly like a settled one and a
        group read as a generic list row rather than as a step.

        The nesting is what the two components require. `BottomSheet.Trigger`
        clones its immediate child and adds `onPress`, so that child has to be
        the pressable `Task.Trigger` itself — handing it the `Task` provider
        would put `onPress` on a plain `View` and the row would stop opening.
        `Task` therefore wraps it from the outside and supplies the context.

        No `icon` is passed, so the glyph is PanelUI's own: a check when the
        step settled, a magnifier while it is running, a warning when it
        failed. That glyph is the point of the row — it is the one thing that
        says how the step ended without opening anything, and the activity-kind
        glyph this used to draw said what kind of tool it was instead, which the
        title already says.

        `open` is shared with the sheet rather than left to `Task`'s own state:
        the chevron turns on it, so a chevron driven by a second, hidden flag
        would stay rotated after the sheet closed.
      */}
      <Task
        onOpenChange={setOpen}
        open={open}
        status={
          failed > 0
            ? 'error'
            // `live` as well as the step's own flag: a step left incomplete by
            // a turn that stopped is not still running, and a shimmer on a
            // settled transcript is an animation that never ends.
            : live && activities.some((step) => !step.complete) ? 'running' : 'complete'
        }
      >
        <BottomSheet.Trigger>
          <Task.Trigger title={rowTitle} />
        </BottomSheet.Trigger>
      </Task>
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
