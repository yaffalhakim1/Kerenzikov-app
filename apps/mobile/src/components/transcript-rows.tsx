import type { AgentSession, Checkpoint, Message } from '@waku/client';
import { activitiesForBlock } from '@waku/client/event-reducer';
import { formatMessageTime } from '@waku/client/transcript-presentation';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Item } from 'panelui-native/components/item';
import { Button } from 'panelui-native/components/button';
import { Message as MessageBubble } from 'panelui-native/components/message';
import { Shimmer } from 'panelui-native/components/shimmer';
import { ThinkingOrb } from 'panelui-native/components/thinking-orb';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Collapsible } from 'panelui-native/components/collapsible';

import { Blocks } from '@/components/blocks';

import { ActivityGroup } from '@/components/activity-group';
import { AppSymbol } from '@/components/app-symbol';
import { AttachmentChip } from '@/components/attachment-chip';
import {
  MdBlockLive,
  MdBlockSettled,
  MdRevealOnMount,
  type VeilRegistry,
} from '@/components/md-block-row';
import { useRowAnchor } from '@/components/transcript-anchor';
import { MonoFont, Radius } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { mentionSegments } from '@/lib/composer-commands';
import { workingOrbState, type TranscriptRow } from '@/lib/session-presentation';
import type { MarkdownStyles } from '@/md/render';
import type { TranscriptMarkdownCache } from '@/md/transcript-cache';

/**
 * One transcript row's content. Memoized on its props: the list hands it the
 * same row object whenever nothing about the row changed, so a stream commit
 * re-renders exactly the live tail block.
 */
export const TranscriptRowView = memo(function TranscriptRowView({
  row,
  md,
  veils,
  seeded,
  markdownStyles,
  model,
  onToggleFold,
}: {
  row: TranscriptRow;
  md: TranscriptMarkdownCache;
  veils: VeilRegistry;
  seeded: boolean;
  markdownStyles: MarkdownStyles;
  /** The session's model id, shown beside the copy control on the terminal
   *  answer so a transcript records what actually produced it. */
  model: string | null;
  onToggleFold: (turnId: string) => void;
}) {
  const theme = useTheme();
  switch (row.kind) {
    case 'user':
      return <UserBubble message={row.message} />;
    case 'system':
      return (
        <View style={styles.systemFrame}>
          <Text style={[styles.systemMessage, { backgroundColor: theme.overlay, color: theme.textTertiary }]}>
            {row.message.display_content ?? row.message.content}
          </Text>
        </View>
      );
    case 'md':
      return (
        <>
          {row.live ? (
            <MdBlockLive
              md={md}
              messageId={row.messageId}
              node={row.node}
              rowKey={row.key}
              seeded={seeded}
              source={row.source}
              styles={markdownStyles}
              veils={veils}
            />
          ) : (
            <MdRevealOnMount enabled={row.streaming && !seeded}>
              <MdBlockSettled node={row.node} source={row.source} styles={markdownStyles} />
            </MdRevealOnMount>
          )}
          {(row.copyText != null || row.footerTimestamp != null) && (
            <View style={styles.messageFooterRow}>
              {row.copyText != null && row.copyText.trim() ? (
                <>
                  <CopyButton label="Copy response" text={row.copyText} />
                  {model ? (
                    <Text
                      numberOfLines={1}
                      style={[styles.messageFooter, styles.messageFooterModel, { color: theme.textTertiary }]}>
                      {model}
                    </Text>
                  ) : null}
                </>
              ) : null}
              {row.footerTimestamp != null && (
                <Text style={[styles.messageFooter, { color: theme.textTertiary }]}>
                  {formatMessageTime(row.footerTimestamp)}
                </Text>
              )}
            </View>
          )}
        </>
      );
    case 'activities':
      return <ActivityGroup block={row.block} live={row.live} />;
    case 'fold':
      return (
        <FoldRow
          expanded={row.expanded}
          label={row.label}
          turnId={row.turn.id}
          onToggle={onToggleFold}
        />
      );
    case 'changed':
      return <ChangedFilesCard checkpoint={row.checkpoint} />;
  }
});

/** Desktop's turn fold: a hairline divider carrying "Worked for X ›". */
function FoldRow({
  label,
  expanded,
  turnId,
  onToggle,
}: {
  label: string;
  expanded: boolean;
  turnId: string;
  onToggle: (turnId: string) => void;
}) {
  const theme = useTheme();
  const keepTop = useRowAnchor();
  // The chevron rotates on the UI thread as the fold opens or closes, so the
  // direction change reads as motion rather than a swap. Transform only, never
  // layout. Reanimated rather than core `Animated`: the two do not compose, and
  // core `Animated` would put these frames back on the JS thread.
  //
  // Not a PanelUI `Collapsible`: that component animates the height of a body
  // it owns, and this disclosure's body is the turn's rows, rendered by the
  // transcript list above it. The trigger is all there is here.
  const reducedMotion = useReducedMotion();
  const rotation = useSharedValue(expanded ? 1 : 0);
  useEffect(() => {
    rotation.value = reducedMotion
      ? expanded ? 1 : 0
      : withTiming(expanded ? 1 : 0, { duration: 140, easing: Easing.out(Easing.ease) });
  }, [expanded, reducedMotion, rotation]);
  const spin = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 90}deg` }],
  }));
  return (
    <Item
      accessibilityHint={expanded ? 'Collapses the agent’s work' : 'Shows the agent’s work'}
      accessibilityLabel={label}
      className="justify-center"
      hitSlop={{ top: 6, bottom: 6 }}
      onPress={() => keepTop(() => onToggle(turnId))}
      pressOpacity={0.6}
      pressScale={1}
      size="xs"
    >
      <View style={[styles.foldLine, { backgroundColor: theme.border }]} />
      <Item.Content>
        <Item.Title numberOfLines={1} className="text-xs text-muted-foreground text-center">
          {label}
        </Item.Title>
      </Item.Content>
      <Item.Actions>
        <Animated.View style={spin}>
          <AppSymbol
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={10}
            tintColor={theme.textGhost}
          />
        </Animated.View>
      </Item.Actions>
      <View style={[styles.foldLine, { backgroundColor: theme.border }]} />
    </Item>
  );
}

/** A visible copy control. Long-press-to-copy is undiscoverable, so the action
 *  gets a button; the confirmation is the icon swapping to a checkmark for a
 *  beat, because a toast would cover the transcript the user is reading. */
function CopyButton({ label, text }: { label: string; text: string }) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      accessibilityLabel={copied ? 'Copied' : label}
      onPress={() => {
        void Clipboard.setStringAsync(text)
          .then(async () => {
            setCopied(true);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          })
          .catch(() => {});
      }}
      size="xs"
      variant="ghost"
    >
      <AppSymbol
        name={copied
          ? { ios: 'checkmark', android: 'check', web: 'check' }
          : { ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' }}
        size={13}
        tintColor={copied ? theme.success : theme.textGhost}
      />
    </Button>
  );
}

const UserBubble = memo(
  UserBubbleInner,
  (previous, next) =>
    previous.message.id === next.message.id &&
    previous.message.content === next.message.content &&
    previous.message.display_content === next.message.display_content &&
    previous.message.attachments === next.message.attachments,
);

function UserBubbleInner({ message }: { message: Message }) {
  const theme = useTheme();
  const content = message.display_content ?? message.content;

  return (
    <View style={styles.userFrame}>
      <MessageBubble align="end">
        <MessageBubble.Content>
          <MessageBubble.Bubble>
            <Pressable
              accessibilityHint="Long press to copy"
              accessibilityLabel={message.display_content ?? message.content}
              delayLongPress={350}
              onLongPress={() => {
                void Clipboard.setStringAsync(message.content)
                  .then(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
                  .catch(() => {});
              }}
            >
              {content ? (
                <MessageBubble.BubbleContent selectable>
                  {mentionSegments(content).map((segment, index) => (
                    segment.kind === 'mention' ? (
                      <Text
                        key={index}
                        style={{ color: theme.accent, fontWeight: '600' }}>
                        {segment.value}
                      </Text>
                    ) : (
                      <Text key={index}>{segment.value}</Text>
                    )
                  ))}
                </MessageBubble.BubbleContent>
              ) : null}
            </Pressable>
            {message.attachments?.length ? (
              <View style={styles.attachments}>
                {message.attachments.map((attachment) => (
                  <AttachmentChip
                    attachment={attachment}
                    key={`${attachment.path}:${attachment.name}`}
                  />
                ))}
              </View>
            ) : null}
          </MessageBubble.Bubble>
        </MessageBubble.Content>
      </MessageBubble>
      {content.trim() ? (
        <View style={styles.userFooterRow}>
          <CopyButton label="Copy message" text={message.content} />
        </View>
      ) : null}
    </View>
  );
}

function ChangedFilesCard({ checkpoint }: { checkpoint: Checkpoint }) {
  const theme = useTheme();
  const keepTop = useRowAnchor();
  const [open, setOpen] = useState(false);
  return (
    <Collapsible
      className="mb-1 rounded-lg border border-border"
      onOpenChange={() => keepTop(() => setOpen((value) => !value))}
      open={open}
      variant="surface"
    >
      <Collapsible.Trigger accessibilityRole="button">
        <AppSymbol
          name={{ ios: 'plusminus', android: 'difference', web: 'difference' }}
          size={13}
          tintColor={theme.textSecondary}
        />
        <Collapsible.Title className="text-sm">
          {checkpoint.files.length} file{checkpoint.files.length === 1 ? '' : 's'} changed
        </Collapsible.Title>
        <Text style={styles.changedStats}>
          <Text style={{ color: theme.success }}>+{checkpoint.additions}</Text>
          <Text style={{ color: theme.textGhost }}> </Text>
          <Text style={{ color: theme.danger }}>−{checkpoint.deletions}</Text>
        </Text>
        <Collapsible.Indicator />
      </Collapsible.Trigger>
      <Collapsible.Content>
        <View style={[styles.changedFiles, { borderTopColor: theme.border }]}>
          {checkpoint.files.map((file) => (
            <View key={file.path} style={styles.changedFileRow}>
              <Text numberOfLines={1} style={[styles.changedFilePath, { color: theme.text }]}>
                {file.path}
              </Text>
              <Text style={styles.changedStats}>
                <Text style={{ color: theme.success }}>+{file.additions}</Text>
                <Text style={{ color: theme.textGhost }}> </Text>
                <Text style={{ color: theme.danger }}>−{file.deletions}</Text>
              </Text>
            </View>
          ))}
        </View>
      </Collapsible.Content>
    </Collapsible>
  );
}

/**
 * The working orb's side, in points.
 *
 * 20 is the size PanelUI documents for the orb beside a line of text, and it
 * is inside the library's small tuning (at or below 32 the orb switches to a
 * separate design with far fewer, proportionally much larger dots, because a
 * faithful lattice at this size is grey mush). It reads against the 12.5pt
 * word it leads without becoming the tallest thing on the screen, which is
 * what the 64pt default did.
 */
const WORKING_ORB_SIZE = 20;

/** Working-indicator flavour words, rotated every 7s, seeded per chat. */
const FLAVOUR_WORDS = [
  'Thinking', 'Pondering', 'Scheming', 'Brewing', 'Weaving', 'Tinkering',
  'Musing', 'Composing', 'Sifting', 'Untangling', 'Distilling', 'Sketching',
  'Plotting', 'Riffing', 'Combobulating', 'Percolating', 'Marinating',
  'Noodling', 'Puzzling', 'Conjuring',
];

function flavourSeed(chatId: string): number {
  let hash = 0x811c9dc5;
  for (let ix = 0; ix < chatId.length; ix += 1) {
    hash ^= chatId.charCodeAt(ix);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

function formatElapsed(seconds: number): string {
  const clamped = Math.max(0, seconds);
  if (clamped < 60) return `${clamped}s`;
  return `${Math.floor(clamped / 60)}m ${clamped % 60}s`;
}

/** The live footer under the streaming tail: spinner, flavour word, elapsed. */
export function WorkingStrip({ session }: { session: AgentSession }) {
  const theme = useTheme();
  const startedAt = session.turns.at(-1)?.started_at ?? null;
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1_000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1_000)), 1_000);
    return () => clearInterval(timer);
  }, []);
  const elapsed = startedAt ? Math.max(0, now - startedAt) : 0;
  const waiting = session.status === 'waiting';
  const word = waiting
    ? 'Waiting for you'
    : `${FLAVOUR_WORDS[(flavourSeed(session.id) + Math.floor(elapsed / 7)) % FLAVOUR_WORDS.length]}…`;
  // The newest activity the running turn produced, so the orb's silhouette says
  // *which* kind of busy this is rather than always showing the same mark.
  const liveActivities = useMemo(() => {
    const block = session.transcript_blocks.at(-1);
    if (!block) return [];
    const activities = activitiesForBlock(block);
    const runningTurnId = session.turns.find((turn) => turn.status === 'running')?.id ?? null;
    return runningTurnId && block.turn_id === runningTurnId ? activities : [];
  }, [session.transcript_blocks, session.turns]);
  return (
    <View accessibilityLiveRegion="polite" style={styles.workingStrip}>
      {/* `size={20}` is the library's own small tuning for a line of text: at
          or below 32 the orb switches to a separate design with far fewer,
          proportionally larger dots, because a faithful lattice at this size
          is grey mush. */}
      <ThinkingOrb
        size={WORKING_ORB_SIZE}
        state={waiting ? 'listening' : workingOrbState(liveActivities)}
      />
      <Shimmer enabled={!waiting} textClassName="text-[12.5px] font-medium">
        {word}
      </Shimmer>
      {startedAt != null && !waiting && (
        <Text style={[styles.workingElapsed, { color: theme.textTertiary }]}>
          {formatElapsed(elapsed)}
        </Text>
      )}
    </View>
  );
}

/**
 * Sits above the oldest mounted row while more history exists; the window
 * extends ahead of the reader so this is rarely on screen for long.
 *
 * Static, not spinning. This is a *positional* hint — "there is more above" —
 * and the rows it stands for arrive on their own when the reader scrolls near
 * it, so nothing is being waited on. A loop here is not free: this mounts for
 * every transcript longer than the initial window (more than 40 rows), which is
 * every real session, and an infinite animation keeps the whole screen
 * compositing forever. Measured on an emulator: a 541-message session sat at a
 * continuous 61 fps with nothing streaming, and the same session's first
 * extension left it at 0. `speed={0}` is `Loader`'s own switch for exactly
 * this — `animate` goes false and the variant draws its representative still
 * frame.
 */
export function EarlierIndicator() {
  const theme = useTheme();
  return (
    <View accessibilityLabel="Earlier messages above" style={styles.earlier}>
      <Blocks color={theme.textTertiary} speed={0} />
    </View>
  );
}

export function SessionEmpty({
  loading,
  error,
  missing,
  onRetry,
}: {
  loading: boolean;
  error: unknown;
  missing: boolean;
  /** Refetch offered beside a load error, so the state names its way out. */
  onRetry?: () => void;
}) {
  const theme = useTheme();
  if (loading) return <Blocks color={theme.accent} />;
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        {missing ? 'Task not found' : error ? 'Couldn’t load this task' : 'No messages yet'}
      </Text>
      {Boolean(error) && (
        <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
          {error instanceof Error ? error.message : String(error)}
        </Text>
      )}
      {Boolean(error) && onRetry && (
        <Button onPress={onRetry} size="sm" variant="outline">
          Try again
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  earlier: { alignItems: 'center', paddingVertical: 10 },
  userFrame: { alignItems: 'flex-end' },
  messageFooterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
    minHeight: 20,
  },
  messageFooter: { fontSize: 11.5 },
  /** A long model id truncates rather than pushing the timestamp out. */
  messageFooterModel: { flexShrink: 1, minWidth: 0 },
  /** Sits under the bubble on the user's side, mirroring the assistant row. */
  userFooterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
    minHeight: 20,
  },
  systemFrame: { alignItems: 'center' },
  systemMessage: {
    borderRadius: Radius.pill,
    fontSize: 11.5,
    lineHeight: 16,
    overflow: 'hidden',
    paddingHorizontal: 11,
    paddingVertical: 5,
    textAlign: 'center',
  },
  attachments: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  foldLine: { flex: 1, height: StyleSheet.hairlineWidth },
  changedStats: { fontSize: 11.5, fontVariant: ['tabular-nums'], fontWeight: '600' },
  changedFiles: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  changedFileRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  changedFilePath: { flex: 1, fontFamily: MonoFont, fontSize: 11 },
  workingStrip: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
    paddingTop: 14,
  },
  workingText: { fontSize: 12.5, fontWeight: '500' },
  workingElapsed: { fontSize: 12, fontVariant: ['tabular-nums'] },
  empty: { alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyBody: { fontSize: 13.5, lineHeight: 19, marginTop: 8, textAlign: 'center' },
});
