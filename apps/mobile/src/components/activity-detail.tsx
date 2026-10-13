import type { ActivityFileChange, ActivityItem } from '@waku/client';
import {
  activityDisclosureSections,
  activityDisplayTitle,
  activityFileChangeStats,
  reasoningTitle,
} from '@waku/client/transcript-presentation';
import { Task } from 'panelui-native/components/task';
import { useRef } from 'react';
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
  const reasoning = activity.reasoning ? activity.reasoning.content.trim() : '';
  const sections = activity.reasoning ? [] : activityDisclosureSections(activity);
  const changes = activity.file_changes ?? [];
  const images = activity.image_urls ?? [];
  const title = activity.reasoning
    ? reasoningTitle(activity)
    : activityDisplayTitle(activity);
  const status = activity.failed ? 'error' : activity.complete ? 'complete' : 'running';

  return (
    <Task defaultOpen status={status}>
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
      <Task.Content>
        {activity.reasoning ? (
          <ReasoningText content={plainReasoning(reasoning)} live={!activity.complete} />
        ) : (
          <>
            <ActivityStatus activity={activity} />
            {sections.map((section) => (
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
        )}
      </Task.Content>
    </Task>
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
  return (
    <Task defaultOpen>
      <Task.Trigger title={label ?? 'Detail'} />
      <Task.Content>
        {content ? (
          mono ? (
            <View style={[styles.well, { backgroundColor: theme.inset, borderColor: theme.border }]}>
              <Text selectable style={[styles.monoText, { color: theme.textSecondary }]}>
                {boundedText(content)}
              </Text>
            </View>
          ) : (
            <Text selectable style={[styles.bodyText, { color: theme.textSecondary }]}>
              {boundedText(content)}
            </Text>
          )
        ) : null}
      </Task.Content>
    </Task>
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
  fileChange: { gap: 8 },
  fileRow: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 24 },
  statusDot: { borderRadius: 3, height: 6, width: 6 },
  filePath: { flex: 1, fontFamily: MonoFont, fontSize: 12 },
  image: { borderRadius: Radius.small, height: 240, width: '100%' },
});
