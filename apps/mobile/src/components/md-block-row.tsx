import { memo, useEffect, useMemo, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { MonoFont } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import type { MarkdownBlock } from '@/md/parse';
import {
  openLinkExternally,
  renderBlock,
  type MarkdownStyles,
  type RenderContext,
} from '@/md/render';
import type { TranscriptMarkdownCache } from '@/md/transcript-cache';
import { RowVeil } from '@/md/veil';

/**
 * Markdown metrics — the desktop's render.rs values scaled up for a phone:
 * body 16/24, headings 21/30 · 18/27 · 17/25 · 16/24, code 13.5/20.
 * Block-level vertical rhythm lives on the transcript rows (`topGap`), so
 * blocks carry no margins of their own.
 */
export function useMarkdownStyles(): MarkdownStyles {
  const theme = useTheme();
  return useMemo<MarkdownStyles>(() => {
    const heading = (size: number, lineHeight: number) => ({
      color: theme.text,
      fontSize: size,
      fontWeight: '600' as const,
      lineHeight,
    });
    return {
      body: { color: theme.text, fontSize: 16, lineHeight: 24 },
      paragraph: {},
      heading: [
        heading(21, 30),
        heading(18, 27),
        heading(17, 25),
        heading(16, 24),
        heading(16, 24),
        heading(16, 24),
      ],
      strong: { fontWeight: '600' },
      em: { fontStyle: 'italic' },
      strikethrough: { color: theme.textSecondary, textDecorationLine: 'line-through' },
      // Monochrome links: primary ink with a muted hairline underline, never
      // accent (desktop render.rs).
      link: {
        color: theme.text,
        textDecorationColor: theme.textTertiary,
        textDecorationLine: 'underline',
      },
      codespan: {
        backgroundColor: theme.codeWash,
        color: theme.codeText,
        fontFamily: MonoFont,
        // Explicit weight: Android resolves a registered multi-weight family
        // through the weight, and a nested run inherits the parent's otherwise.
        fontWeight: '400',
        fontSize: 13.5,
      },
      codeBlock: {
        backgroundColor: theme.inset,
        borderColor: theme.border,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
      },
      codeHeader: {
        borderBottomColor: theme.border,
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 12,
        paddingVertical: 5,
      },
      codeHeaderText: { color: theme.textTertiary, fontFamily: MonoFont, fontSize: 12, fontWeight: '500' },
      codeContent: { paddingHorizontal: 12, paddingVertical: 10 },
      codeLine: {
        color: theme.text,
        fontFamily: MonoFont,
        fontWeight: '400',
        fontSize: 13.5,
        lineHeight: 20,
      },
      blockquote: {
        backgroundColor: theme.accentSoft,
        borderBottomRightRadius: 6,
        borderLeftColor: theme.accent,
        borderLeftWidth: 2,
        borderTopRightRadius: 6,
        gap: 8,
        paddingLeft: 12,
        paddingRight: 10,
        paddingVertical: 6,
      },
      list: { gap: 4 },
      listItem: { flexDirection: 'row', gap: 8 },
      listMarker: {
        color: theme.accent,
        fontSize: 16,
        fontVariant: ['tabular-nums'],
        lineHeight: 24,
        minWidth: 20,
        textAlign: 'right',
      },
      listContent: { flex: 1, gap: 4 },
      // A bordered grid, matching the desktop's `render_table`: rounded frame,
      // hairline border, overlay-filled header. The frame owns the outer border
      // and clips the rows to it, so the table reads as one object instead of
      // loose cells. Column widths come from the renderer's shared weights, not
      // from each cell's own text.
      table: {},
      tableGrid: {
        borderColor: theme.border,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
      },
      tableRow: {
        borderBottomColor: theme.border,
        borderBottomWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
      },
      tableRowLast: { borderBottomWidth: 0 },
      tableHeadRow: { backgroundColor: theme.overlay },
      tableCell: {
        borderRightColor: theme.border,
        borderRightWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 10,
        paddingVertical: 7,
      },
      tableCellLast: { borderRightWidth: 0 },
      tableNumerals: { fontVariant: ['tabular-nums'] },
      tableCellText: { color: theme.text, fontSize: 15, lineHeight: 22 },
      tableHeadText: { color: theme.text, fontSize: 15, fontWeight: '600', lineHeight: 22 },
      hr: { backgroundColor: theme.border, height: 1 },
      image: {
        backgroundColor: theme.inset,
        borderRadius: 10,
        height: 200,
        width: '100%',
      },
    };
  }, [theme]);
}

/** One RowVeil per live row, dropped on the live→settled flip. */
export class VeilRegistry {
  private veils = new Map<string, RowVeil>();

  get(rowKey: string, seeded: boolean): RowVeil {
    let veil = this.veils.get(rowKey);
    if (!veil) {
      veil = new RowVeil(seeded);
      this.veils.set(rowKey, veil);
    }
    return veil;
  }

  drop(rowKey: string) {
    this.veils.delete(rowKey);
  }
}

function staticContext(styles: MarkdownStyles): RenderContext {
  return {
    styles,
    veil: null,
    now: 0,
    ordinal: { value: 0 },
    hadSpans: false,
    onOpenLink: openLinkExternally,
  };
}

/**
 * Blocks born settled while their message streams (a fast commit can close a
 * paragraph and mint two list items at once) fade in as whole rows — without
 * this, everything that lands outside the live tail pops at full alpha and
 * the reveal reads as jank. Compositor-driven; layout is final at mount.
 */
export function MdRevealOnMount({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const fade = enabled && !reducedMotion;
  // Reanimated rather than core `Animated`: PanelUI's own rule, and the one
  // this file is now subject to. Core `Animated` does not compose with
  // Reanimated and its API encourages patterns that put the frames back on the
  // JS thread.
  const opacity = useSharedValue(fade ? 0 : 1);
  useEffect(() => {
    if (!fade) return;
    opacity.value = withTiming(1, { duration: 240 });
  }, [fade, opacity]);
  /*
   * Every hook runs on every render, including the `!fade` one.
   *
   * `useAnimatedStyle` used to sit *after* the early return below, so a row
   * that mounted without a fade and then gained one — which is exactly what a
   * streaming turn does as `enabled` flips — ran a different number of hooks
   * than its previous render and React aborted the whole screen with
   * "Rendered fewer hooks than expected". The style is computed
   * unconditionally instead; when there is no fade the value is 1, so the
   * branch below returns the children unwrapped and the style is discarded.
   */
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  if (!fade) return <>{children}</>;
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** A settled markdown block. Re-renders only when its source changes — the
 * incremental parser keeps node identity stable across commits, so streamed
 * tokens never touch this. */
export const MdBlockSettled = memo(
  function MdBlockSettled({
    node,
    styles,
    source,
  }: {
    node: MarkdownBlock['node'];
    source: string;
    styles: MarkdownStyles;
  }) {
    /*
     * One renderer for every block. This used to hand paragraphs, headings and
     * fences to PanelUI's `Response` and keep only the structural blocks
     * (tables, lists, quotes) here, and that split was the defect: the two
     * renderers style inline code differently. `Response` draws it with its own
     * tokens (`bg-muted` plus an inherited colour, and `font-mono`, which
     * resolves to Android's generic `monospace` because no `--font-mono` is
     * declared), while this renderer draws it with the house tokens
     * (`codeWash`, the brand `codeText`, and the bundled JetBrains Mono). A
     * paragraph therefore showed a grey pill with a non-code face and a list
     * item showed a brand-tinted one with the right face — in the same
     * transcript, and disagreeing further in dark mode, where only `Response`'s
     * own theme tokens move.
     *
     * Nothing is lost by coming back: fenced code already goes to PanelUI's
     * `CodeBlock` from this renderer (`md/render.tsx`), so the only difference
     * is that inline code now matches it. The live tail was always here — this
     * is what removes the seam between the two halves of one message.
     */
    return <>{renderBlock(node, staticContext(styles), 'b')}</>;
  },
  (previous, next) => previous.source === next.source && previous.styles === next.styles,
);

/**
 * The live tail block of the streaming message: renders the mended display
 * tail, dissolving appended text in via the veil. The veil gate applies — only
 * paragraphs and headings veil; structural blocks (code, lists, tables)
 * appear settled-style.
 */
export function MdBlockLive({
  rowKey,
  messageId,
  node,
  md,
  veils,
  seeded,
  styles,
}: {
  rowKey: string;
  messageId: string;
  node: MarkdownBlock['node'];
  source: string;
  md: TranscriptMarkdownCache;
  veils: VeilRegistry;
  seeded: boolean;
  styles: MarkdownStyles;
}) {
  const reducedMotion = useReducedMotion();
  useEffect(() => () => veils.drop(rowKey), [rowKey, veils]);

  const tail = md.parserFor(messageId)?.displayTail() ?? null;
  const blocks = tail ?? [{ node }];
  // Every live block type veils — a list item or code line popping at full
  // alpha next to fading prose reads as jank, not structure.
  const veil = reducedMotion ? null : veils.get(rowKey, seeded);
  const ctx: RenderContext = {
    styles,
    veil,
    now: Date.now(),
    ordinal: { value: 0 },
    hadSpans: false,
    onOpenLink: openLinkExternally,
  };
  veil?.beginFrame();
  const children = blocks.map((block, index) => renderBlock(block.node, ctx, index));
  veil?.finishFrame();
  // No ticker. Each fading run animates itself on the compositor from the
  // opacity and remaining time the veil handed it, so this row only renders
  // when its text changes — not ~30 times a second while a stream runs.
  return <>{children}</>;
}
