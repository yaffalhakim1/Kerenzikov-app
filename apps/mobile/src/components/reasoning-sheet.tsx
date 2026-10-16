import type { ActivityItem } from '@waku/client';
import { reasoningTitle } from '@waku/client/transcript-presentation';
import { BottomSheet } from 'panelui-native/components/bottom-sheet';
import { Task } from 'panelui-native/components/task';
import { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppSymbol } from './app-symbol';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { VeilFade } from '@/md/render';
import { RowVeil, splitRunAtSpans } from '@/md/veil';

/**
 * The model's reasoning, as a row in the transcript and a sheet you open.
 *
 * The row is a `Task.Trigger`, so a live trace shimmers while it arrives and
 * the glyph names what happened once it lands — the same vocabulary a step row
 * uses, which is the point: a trace is a step the agent took, and it should not
 * be the one row that reads differently.
 *
 * The body is a sheet rather than an inline fold, and that is what keeps a long
 * task cheap. A trace is the one thing in the transcript that arrives as a wall
 * of text — one giant paragraph or one giant list, so no block-count cap bounds
 * it — and `Collapse` keeps its children mounted, so an inline fold laid out
 * every line of every trace whether or not anyone read them. `BottomSheet`
 * mounts nothing until it is first presented, so a closed trace now costs one
 * row.
 *
 * `size="half"` on purpose: a trace is read at a glance and then dismissed,
 * unlike a step group's sheet, which can hold tens of kilobytes of command
 * output and so opens full. The body still scrolls.
 */
export function ReasoningSheet({
  reasoning,
  live,
}: {
  /** Every reasoning activity in the group, oldest first. */
  reasoning: readonly ActivityItem[];
  /** True while the turn is still producing this trace. */
  live: boolean;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  if (!reasoning.length) return null;

  const running = live && reasoning.some((activity) => !activity.complete);
  const label = reasoningLabel(reasoning);

  return (
    <BottomSheet open={open} onOpenChange={setOpen}>
      {/*
        `Task` wraps `BottomSheet.Trigger`, never the other way round:
        `BottomSheet.Trigger` clones its immediate child and adds `onPress`, so
        that child has to be the pressable `Task.Trigger` itself. Handing it the
        `Task` provider would put `onPress` on a plain `View` and the row would
        stop opening. Same nesting `StepGroup` uses for a step group.
      */}
      <Task onOpenChange={setOpen} open={open} status={running ? 'running' : 'complete'}>
        <BottomSheet.Trigger>
          <Task.Trigger
            icon={
              <AppSymbol
                name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                size={15}
                tintColor={theme.textSecondary}
              />
            }
            title={label}
          />
        </BottomSheet.Trigger>
      </Task>
      <BottomSheet.Content accessibilityLabel={label} size="half">
        <BottomSheet.Header title={label} />
        <BottomSheet.Body>
          {/*
            Built inside the body, which is why the trace is assembled here
            rather than above. `BottomSheet.Content` returns null until it is
            first presented, so this is the one place that only runs for a trace
            the reader asked to read — the same trade `ActivityBody` makes for a
            step. Assembling it in the sheet's own render would run the trimming
            and the three regex passes over every trace on every stream commit,
            which is the cost this sheet exists to avoid.
          */}
          <ReasoningTrace live={running} reasoning={reasoning} />
        </BottomSheet.Body>
      </BottomSheet.Content>
    </BottomSheet>
  );
}

/**
 * The trace's row, in the shared presentation layer's own words: "Thinking"
 * while it is still arriving, "Thought for 8 seconds" once it has landed.
 *
 * Taken from `reasoningTitle` rather than restated here, so the row cannot
 * drift from the same phrase the desktop draws for the same activity.
 */
function reasoningLabel(reasoning: readonly ActivityItem[]): string {
  const newest = reasoning.at(-1);
  return newest ? reasoningTitle(newest) : 'Thinking';
}

/**
 * The joined trace of every reasoning item in the group, as quiet plain text.
 *
 * Joined rather than one panel each: a provider can emit a run of separate
 * reasoning parts for a single thought, and one sheet per part is a column of
 * "Thinking…" rows.
 */
function ReasoningTrace({
  reasoning,
  live,
}: {
  reasoning: readonly ActivityItem[];
  live: boolean;
}) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const content = reasoning
    .map((activity) => plainReasoning(activity.reasoning?.content.trim() ?? ''))
    .filter(Boolean)
    .join('\n\n');
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

/** Reasoning is throwaway thinking: render it as quiet plain text, never
 * heavier than the answer. Strips the markdown emphasis and heading markers
 * providers put on their summary headlines. */
function plainReasoning(value: string): string {
  const limit = 12_000;
  const bounded = value.length <= limit ? value : `${value.slice(0, limit)}\n\n… Output truncated`;
  return bounded
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '');
}

const styles = StyleSheet.create({
  bodyText: { fontSize: 14.5, lineHeight: 21 },
});
