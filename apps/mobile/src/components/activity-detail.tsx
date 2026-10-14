import type { ActivityFileChange, ActivityItem } from '@waku/client';
import {
  activityDisclosureSections,
  activityDisplayTitle,
  activityFileChangeStats,
  reasoningTitle,
} from '@waku/client/transcript-presentation';
import { Task } from 'panelui-native/components/task';
import { useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { ACTIVITY_ICONS } from './activity-icons';
import { AppSymbol } from './app-symbol';
import { DiffView } from './diff-view';

import { MonoFont, NativeTint, Radius } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { VeilFade } from '@/md/render';
import { RowVeil, splitRunAtSpans } from '@/md/veil';

/**
 * One command's full detail — output, arguments, diff, file changes, images —
 * as a nested PanelUI `Task` inside the group's own `Task`.
 *
 * This used to be page two of a bottom sheet. It moved in here so the
 * transcript stays one surface: the group opens in place, and a command opens
 * inside it, rather than the whole transcript being swapped for a sheet. The
 * nested Task is the disclosure, so the same gesture means the same thing at
 * both levels.
 */
export function ActivityDetail({ activity }: { activity: ActivityItem }) {
  const theme = useTheme();
  const title = activity.reasoning
    ? reasoningTitle(activity)
    : activityDisplayTitle(activity);
  const status = activity.failed ? 'error' : activity.complete ? 'complete' : 'running';

  /*
   * Closed by default, and the body is not built until it is opened.
   *
   * PanelUI's own `Task` note is the rule here: "The header is the step; the
   * body is the detail nobody reads unless something went wrong." This used to
   * pass `defaultOpen` unconditionally, so every step drew its whole body - and
   * a real transcript is not a handful of steps. One measured session held 348
   * activity groups carrying 1.3M characters of command output, 628K of
   * reasoning and 425K of arguments, with a single group holding 108 commands.
   *
   * Collapsing alone did not help, twice over: `Task.Content` feeds a
   * `Collapse`, which keeps its children mounted and animates only the clip
   * height, and the derivation above it (`activityDisclosureSections` trims and
   * hands back the full output and arguments) ran whether or not anything was
   * drawn. So the body lives in `ActivityBody`, which is not mounted until the
   * step is open. A closed step is one row: a title, an icon and a chevron.
   *
   * `Collapse`'s "do not unmount the body" advice is about a body that is still
   * streaming or that the reader has scrolled to; a command's settled output is
   * neither, so rebuilding it on open is the cheaper trade.
   */
  const [open, setOpen] = useState(activity.failed || status === 'running');

  return (
    <Task open={open} onOpenChange={setOpen} status={status}>
      <Task.Trigger
        icon={
          <AppSymbol
            name={ACTIVITY_ICONS[activity.kind]}
            size={15}
            tintColor={activity.failed ? theme.danger : theme.textSecondary}
          />
        }
        title={title}
      />
      <Task.Content>{open ? <ActivityBody activity={activity} /> : null}</Task.Content>
    </Task>
  );
}

/**
 * Everything a step's body needs, and nothing until it is shown.
 *
 * Separate from `ActivityDetail` so the trimming, bounding and reasoning
 * cleanup run only for the step the reader opened rather than for every step in
 * the transcript. See the note on `ActivityDetail` for what that cost.
 */
function ActivityBody({ activity }: { activity: ActivityItem }) {
  const theme = useTheme();
  const changes = activity.file_changes ?? [];
  const images = activity.image_urls ?? [];

  if (activity.reasoning) {
    const reasoning = activity.reasoning.content.trim();
    return <ReasoningText content={plainReasoning(reasoning)} live={!activity.complete} />;
  }

  return (
    <>
      <ActivityStatus activity={activity} />
      {activityDisclosureSections(activity).map((section) => (
        <DetailSection
          content={section.content}
          key={section.kind}
          label={section.label}
          mono={section.kind !== 'detail'}
        />
      ))}
      {changes.map((change) => (
        <FileChange change={change} key={change.path} />
      ))}
      {images.map((url, index) => (
        <Image
          accessibilityIgnoresInvertColors
          key={index}
          resizeMode="contain"
          source={{ uri: url }}
          style={[styles.image, { backgroundColor: theme.inset }]}
        />
      ))}
    </>
  );
}

/** Failure, progress, and edit totals under the title — each paired with a
 * word or glyph, never carried by color alone. */
function ActivityStatus({ activity }: { activity: ActivityItem }) {
  const theme = useTheme();
  if (activity.failed) {
    return (
      <View style={styles.status}>
        <AppSymbol
          name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
          size={12}
          tintColor={theme.danger}
        />
        <Text style={[styles.statusText, { color: theme.danger }]}>Failed</Text>
      </View>
    );
  }
  // A live thought already says "Thinking" in its title.
  if (!activity.complete && !activity.reasoning) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.status}>
        <View style={[styles.runningDot, { backgroundColor: NativeTint }]} />
        <Text style={[styles.statusText, { color: theme.textTertiary }]}>In progress</Text>
      </View>
    );
  }
  const stats = activityFileChangeStats(activity);
  if (stats) {
    return (
      <Text style={[styles.statusText, styles.stats]}>
        <Text style={{ color: theme.success }}>+{stats.additions}</Text>
        <Text style={{ color: theme.textGhost }}> </Text>
        <Text style={{ color: theme.danger }}>−{stats.deletions}</Text>
      </Text>
    );
  }
  return null;
}

/**
 * One labelled block of a step's detail: the command, its output, its arguments.
 *
 * Deliberately not a nested `Task`. It was one, so every section cost another
 * `Collapse` with its own shared value, an `Animated.View`, a `Pressable` and an
 * SVG chevron - on top of the step's own `Task` and the group's above it. A
 * step with a command and an output therefore built three nested `Task`s, and a
 * window of steps built them by the hundred: measured on a real session, 743
 * views in the hierarchy and a stall of about a second when the screen opened,
 * with the JS side accounting for only ~100ms of it.
 *
 * A section has no state of its own to fold - the step above it is the thing
 * that opens and closes - so the label is just a heading.
 */
function DetailSection({
  label,
  content,
  mono,
}: {
  label: string | null;
  content: string;
  mono: boolean;
}) {
  const theme = useTheme();
  if (!content) return null;
  return (
    <View style={styles.section}>
      {label ? (
        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>{label}</Text>
      ) : null}
      {mono ? (
        <View style={[styles.well, { backgroundColor: theme.inset, borderColor: theme.border }]}>
          <Text selectable style={[styles.monoText, { color: theme.textSecondary }]}>
            {boundedText(content)}
          </Text>
        </View>
      ) : (
        <Text selectable style={[styles.bodyText, { color: theme.textSecondary }]}>
          {boundedText(content)}
        </Text>
      )}
    </View>
  );
}

function FileChange({ change }: { change: ActivityFileChange }) {
  const theme = useTheme();
  const status = change.status ?? 'modified';
  const statusColor = status === 'added'
    ? theme.success
    : status === 'deleted'
      ? theme.danger
      : theme.warning;
  const statusWord = status === 'added' ? 'Added' : status === 'deleted' ? 'Deleted' : 'Modified';
  const diff = change.diff?.trim() ? change.diff : null;
  return (
    <View style={styles.fileChange}>
      <View accessible accessibilityLabel={`${statusWord} ${change.path}`} style={styles.fileRow}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text ellipsizeMode="head" numberOfLines={1} style={[styles.filePath, { color: theme.text }]}>
          {change.path}
        </Text>
        {(change.additions != null || change.deletions != null) && (
          <Text style={[styles.statusText, styles.stats]}>
            <Text style={{ color: theme.success }}>+{change.additions ?? 0}</Text>
            <Text style={{ color: theme.textGhost }}> </Text>
            <Text style={{ color: theme.danger }}>−{change.deletions ?? 0}</Text>
          </Text>
        )}
      </View>
      {diff ? <DiffView diff={diff} /> : null}
    </View>
  );
}

/** Streaming reasoning dissolves in like the message veil. Appended text is
 * faded by a compositor animation per run; text present at mount is adopted at
 * full opacity. */
function ReasoningText({ content, live }: { content: string; live: boolean }) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const veil = useRef<RowVeil | null>(null);
  veil.current ??= new RowVeil(content.length > 0);
  const spans = live && !reducedMotion ? veil.current.advance(0, content, Date.now()) : [];
  return (
    <Text selectable style={[styles.bodyText, { color: theme.textSecondary }]}>
      {splitRunAtSpans(0, content.length, spans).map(([start, end, opacity, remainingMs]) =>
        opacity >= 1 ? (
          content.slice(start, end)
        ) : (
          <VeilFade key={start} opacity={opacity} remainingMs={remainingMs}>
            {content.slice(start, end)}
          </VeilFade>
        ),
      )}
    </Text>
  );
}

function boundedText(value: string): string {
  const limit = 12_000;
  return value.length <= limit ? value : `${value.slice(0, limit)}\n\n… Output truncated`;
}

/** Reasoning is throwaway thinking: render it as quiet plain text, never
 * heavier than the answer. Strips the markdown emphasis and heading markers
 * providers put on their summary headlines. */
function plainReasoning(value: string): string {
  return boundedText(value)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '');
}

const styles = StyleSheet.create({
  runningDot: { borderRadius: 3, height: 6, width: 6 },
  status: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  statusText: { fontSize: 13 },
  stats: { fontVariant: ['tabular-nums'], fontWeight: '600' },
  well: {
    borderRadius: Radius.small,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  monoText: { fontFamily: MonoFont, fontSize: 12, lineHeight: 17.5 },
  bodyText: { fontSize: 14.5, lineHeight: 21 },
  section: { gap: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  fileChange: { gap: 8 },
  fileRow: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 24 },
  statusDot: { borderRadius: 3, height: 6, width: 6 },
  filePath: { flex: 1, fontFamily: MonoFont, fontSize: 12 },
  image: { borderRadius: Radius.small, height: 240, width: '100%' },
});
