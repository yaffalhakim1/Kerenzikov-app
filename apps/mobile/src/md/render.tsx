/**
 * mdast → React Native elements, with the streaming veil applied as
 * paint-only color fades.
 *
 * Mirrors the desktop renderer's contract (`src/md/render.rs`): every
 * text-bearing flow element (paragraph, heading, code block, table cell, …)
 * gets a stable ordinal in document order and its *visible* text is the veil
 * key. Veil spans split leaf runs and multiply foreground/background alpha —
 * they can never change shaping, wrapping, or heights.
 */

import type {
  BlockContent,
  DefinitionContent,
  ListItem,
  PhrasingContent,
  RootContent,
} from 'mdast';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Linking,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { AppPressable } from '@/components/app-pressable';
import { AppSymbol } from '@/components/app-symbol';

import { PENDING_LINK_URL } from './mend';
import { columnWidthsFor } from './table';
import { VEIL_CURVE_POW, splitRunAtSpans, type RowVeil, type VeilSpan } from './veil';

/**
 * One run of appended text dissolving in.
 *
 * The fade is a native-driver opacity animation, so it runs on the compositor
 * at display rate and costs the JS thread nothing. It replaced a JS timer that
 * sampled the veil and re-rendered every span's colour ~30 times a second —
 * frame work landing on the JS thread precisely while a stream is committing.
 *
 * `opacity` and `remainingMs` are read once, at mount: the veil handed this run
 * a starting alpha and the time it has left, and from there the run owns its
 * own fade. Later renders (more text arriving) update the props of a span that
 * is already animating and must not disturb it.
 */
export function VeilFade({
  opacity,
  remainingMs,
  children,
}: {
  opacity: number;
  remainingMs: number;
  children: ReactNode;
}) {
  const value = useRef(new Animated.Value(opacity)).current;
  useEffect(() => {
    Animated.timing(value, {
      toValue: 1,
      duration: Math.max(1, remainingMs),
      // The same curve `veilOpacity` applies: 1 - (1 - t) ^ VEIL_CURVE_POW.
      easing: Easing.out(Easing.poly(VEIL_CURVE_POW)),
      useNativeDriver: true,
    }).start();
    // Mount-only by design; see above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // RN's text attributes multiply foreground *and* background alpha by this,
  // which is exactly what the previous inline `applyAlpha` pair did.
  return <Animated.Text style={{ opacity: value }}>{children}</Animated.Text>;
}

export interface MarkdownStyles {
  body: TextStyle & { color: string };
  paragraph: ViewStyle;
  /** h1–h6. Each carries its own color. */
  heading: readonly (TextStyle & { color: string })[];
  strong: TextStyle;
  em: TextStyle;
  strikethrough: TextStyle & { color: string };
  link: TextStyle & { color: string };
  codespan: TextStyle & { color: string; backgroundColor: string };
  codeBlock: ViewStyle;
  codeHeader: ViewStyle;
  codeHeaderText: TextStyle & { color: string };
  codeContent: ViewStyle;
  codeLine: TextStyle & { color: string };
  blockquote: ViewStyle;
  list: ViewStyle;
  listItem: ViewStyle;
  listMarker: TextStyle & { color: string };
  listContent: ViewStyle;
  table: ViewStyle;
  /** The bordered grid wrapping every row; owns the outer border and radius. */
  tableGrid: ViewStyle;
  tableRow: ViewStyle;
  /** Drops the final rule, which the grid's outer border already draws. */
  tableRowLast: ViewStyle;
  tableHeadRow: ViewStyle;
  tableCell: ViewStyle;
  /** Drops the final cell's right rule against the grid border. */
  tableCellLast: ViewStyle;
  /** Tabular figures, so numeric columns do not jitter between rows. */
  tableNumerals: TextStyle;
  tableCellText: TextStyle & { color: string };
  tableHeadText: TextStyle & { color: string };
  hr: ViewStyle;
  image: ImageStyle;
}

export interface RenderContext {
  styles: MarkdownStyles;
  /** `null` renders at full opacity with no veil bookkeeping. */
  veil: RowVeil | null;
  now: number;
  /** Next text-element ordinal; advances in document order. */
  ordinal: { value: number };
  /** True once any element of the current block produced active spans. */
  hadSpans: boolean;
  onOpenLink: (url: string) => void;
}

interface InlineContext {
  block: RenderContext;
  spans: readonly VeilSpan[];
  cursor: { value: number };
}

export function openLinkExternally(url: string) {
  Linking.openURL(url).catch(() => {});
}

/** Header layout and the copy target are renderer-owned chrome rather than
 *  theme tokens — the palette stays in `MarkdownStyles`, these are structure.
 *  Named `chrome`, not `styles`: `MarkdownStyles` arrives on the render
 *  context as `styles` and would shadow a same-named module binding. */
const chrome = StyleSheet.create({
  /** Mirrors `MarkdownStyles.codeHeader`'s padding; the theme keeps the
   *  colors and the caller owns both, so this only adds the row layout. */
  codeHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  codeHeaderLabel: { flexShrink: 1 },
  copyButton: {
    alignItems: 'center',
    borderRadius: 6,
    height: 20,
    justifyContent: 'center',
    width: 24,
  },
});

/** Visible text of an inline tree. Must mirror `renderInline`'s traversal
 * exactly — the veil's span offsets are positions in this string. */
export function flattenInline(nodes: readonly PhrasingContent[]): string {
  let flat = '';
  for (const node of nodes) {
    flat += inlineText(node);
  }
  return flat;
}

function inlineText(node: PhrasingContent): string {
  switch (node.type) {
    case 'text':
    case 'html':
    case 'inlineCode':
      return node.value;
    case 'break':
      return '\n';
    case 'image':
    case 'imageReference':
    case 'footnoteReference':
      return '';
    default:
      return 'children' in node ? flattenInline(node.children) : '';
  }
}

/** Begin one veil-keyed text element: assign its ordinal and fetch spans. */
function beginTextElement(ctx: RenderContext, flat: string): readonly VeilSpan[] {
  const ordinal = ctx.ordinal.value;
  ctx.ordinal.value += 1;
  if (!ctx.veil) return [];
  const spans = ctx.veil.advance(ordinal, flat, ctx.now);
  if (spans.length) ctx.hadSpans = true;
  return spans;
}

function inlineContext(ctx: RenderContext, flat: string): InlineContext {
  return { block: ctx, spans: beginTextElement(ctx, flat), cursor: { value: 0 } };
}

/**
 * Emit one leaf run, split at veil boundaries. Unveiled unstyled pieces stay
 * raw strings so React Native can merge them into the parent text node.
 */
function renderLeaf(
  value: string,
  ictx: InlineContext,
  style?: TextStyle & { color?: string; backgroundColor?: string },
): ReactNode[] {
  const start = ictx.cursor.value;
  ictx.cursor.value += value.length;
  if (!value) return [];
  const pieces = splitRunAtSpans(start, value.length, ictx.spans);
  return pieces.map(([pieceStart, pieceEnd, opacity, remainingMs]) => {
    const slice = value.slice(pieceStart - start, pieceEnd - start);
    if (opacity >= 1 && !style) return slice;
    if (opacity < 1) {
      return (
        <VeilFade key={`p${pieceStart}`} opacity={opacity} remainingMs={remainingMs}>
          <Text style={style}>{slice}</Text>
        </VeilFade>
      );
    }
    return (
      <Text key={`p${pieceStart}`} style={style}>
        {slice}
      </Text>
    );
  });
}

function renderInline(
  nodes: readonly PhrasingContent[],
  ictx: InlineContext,
): ReactNode[] {
  const { styles } = ictx.block;
  return nodes.flatMap((node, index) => {
    switch (node.type) {
      case 'text':
      case 'html':
        return renderLeaf(node.value, ictx);
      case 'inlineCode':
        return renderLeaf(node.value, ictx, styles.codespan);
      case 'break':
        return renderLeaf('\n', ictx);
      case 'strong':
        return (
          <Text key={`n${index}`} style={styles.strong}>
            {renderInline(node.children, ictx)}
          </Text>
        );
      case 'emphasis':
        return (
          <Text key={`n${index}`} style={styles.em}>
            {renderInline(node.children, ictx)}
          </Text>
        );
      case 'delete':
        return (
          <Text key={`n${index}`} style={styles.strikethrough}>
            {renderInline(node.children, ictx)}
          </Text>
        );
      case 'link': {
        // A link whose URL is still streaming is styled but inert (see mend).
        const pending = node.url === PENDING_LINK_URL;
        return (
          <Text
            accessibilityRole="link"
            key={`n${index}`}
            onPress={pending ? undefined : () => ictx.block.onOpenLink(node.url)}
            style={styles.link}
            suppressHighlighting>
            {renderInline(node.children, ictx)}
          </Text>
        );
      }
      case 'linkReference':
        // Unresolved references render as link-styled text without a target.
        return (
          <Text key={`n${index}`} style={styles.link}>
            {renderInline(node.children, ictx)}
          </Text>
        );
      case 'image':
      case 'imageReference':
      case 'footnoteReference':
        return [];
      default:
        return 'children' in node
          ? renderInline((node as { children: PhrasingContent[] }).children, ictx)
          : [];
    }
  });
}

/** Split paragraph children at images so images render as blocks between
 * text runs — RN cannot lay out images inside a Text flow. */
function paragraphSegments(children: readonly PhrasingContent[]) {
  const segments: Array<
    | { kind: 'text'; nodes: PhrasingContent[] }
    | { kind: 'image'; url: string; alt: string; href?: string }
  > = [];
  let run: PhrasingContent[] = [];
  const flushRun = () => {
    if (run.length) segments.push({ kind: 'text', nodes: run });
    run = [];
  };
  for (const child of children) {
    if (child.type === 'image') {
      flushRun();
      segments.push({ kind: 'image', url: child.url, alt: child.alt ?? '' });
    } else if (
      child.type === 'link' &&
      child.children.length === 1 &&
      child.children[0]!.type === 'image'
    ) {
      flushRun();
      const image = child.children[0]!;
      segments.push({
        kind: 'image',
        url: image.url,
        alt: image.alt ?? '',
        href: child.url,
      });
    } else {
      run.push(child);
    }
  }
  flushRun();
  return segments;
}

function renderParagraph(
  children: readonly PhrasingContent[],
  ctx: RenderContext,
  key: string | number,
): ReactNode {
  const { styles } = ctx;
  const ictx = inlineContext(ctx, flattenInline(children));
  const segments = paragraphSegments(children);
  return (
    <View key={key} style={styles.paragraph}>
      {segments.map((segment, index) =>
        segment.kind === 'text' ? (
          <Text key={index} selectable style={styles.body}>
            {renderInline(segment.nodes, ictx)}
          </Text>
        ) : (
          <MarkdownImage
            href={segment.href}
            key={index}
            label={segment.alt}
            styles={styles}
            url={segment.url}
            onOpenLink={ctx.onOpenLink}
          />
        ),
      )}
    </View>
  );
}

function MarkdownImage({
  url,
  label,
  href,
  styles,
  onOpenLink,
}: {
  url: string;
  label: string;
  href?: string;
  styles: MarkdownStyles;
  onOpenLink: (url: string) => void;
}) {
  const image = (
    <Image
      accessibilityLabel={label || undefined}
      resizeMode="contain"
      source={{ uri: url }}
      style={styles.image}
    />
  );
  if (!href || href === PENDING_LINK_URL) return image;
  return (
    <AppPressable accessibilityRole="link" onPress={() => onOpenLink(href)}>
      {image}
    </AppPressable>
  );
}

/** Horizontal scroller host for wide blocks (code, tables) inside the
 *  inverted transcript. gesture-handler's ScrollView routes touches through
 *  the app's gesture orchestrator, which keeps horizontal pans working inside
 *  the transformed (scaleY -1) scroll tree on Android; nestedScrollEnabled
 *  lets the vertical list take over when the content ends. */
const scrollContentStyle = { minWidth: '100%' } as const;

/** The narrowest a table grid is allowed to be, dp. Below it the columns stop
 *  reading as a table, so the grid keeps this width and pans. */
const TABLE_MIN_WIDTH = 260;

/** The transcript column's cap, mirroring MAX_CONTENT_WIDTH in
 *  components/transcript-list.tsx. Duplicated rather than imported because
 *  the list already imports this module and the cycle would be circular. */
const TRANSCRIPT_MAX_WIDTH = 736;
/** The list's horizontal padding (Spacing.three), taken out of the budget. */
const TRANSCRIPT_GUTTER = 32;

/** The width a table may occupy before it starts panning. A phone's transcript
 *  column is narrower than most tables, and a fitted table reads far better
 *  than one that demands a long horizontal drag. */
function tableBudget(): number {
  const viewport = Dimensions.get('window').width;
  return Math.max(TABLE_MIN_WIDTH, Math.min(viewport, TRANSCRIPT_MAX_WIDTH) - TRANSCRIPT_GUTTER);
}

/**
 * Copy control for a fenced block, mounted in the block's header.
 *
 * `renderCode` is a plain function, so this component is the only stateful
 * node in a rendered block: `memo` gives it a stable identity across the
 * parent's re-renders, which is what lets the confirmation survive a repaint.
 * A still-streaming block re-renders with new `value` each commit, so its
 * checkmark can reset — correct, because the text being copied is still
 * changing. The copied string is the block's own source, which is exactly
 * what was fenced, not the flattened render.
 */
const CodeCopyButton = memo(function CodeCopyButton({
  tint,
  value,
}: {
  tint: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <AppPressable
      accessibilityLabel={copied ? 'Copied' : 'Copy code'}
      accessibilityRole="button"
      hitSlop={10}
      onPress={() => {
        void Clipboard.setStringAsync(value)
          .then(async () => {
            setCopied(true);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          })
          .catch(() => {});
      }}
      style={({ pressed }) => [chrome.copyButton, { opacity: pressed ? 0.5 : 1 }]}>
      <AppSymbol
        name={copied
          ? { ios: 'checkmark', android: 'check', web: 'check' }
          : { ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' }}
        size={12}
        tintColor={tint}
      />
    </AppPressable>
  );
});

function renderCode(
  value: string,
  language: string | null,
  ctx: RenderContext,
  key: string | number,
): ReactNode {
  const { styles } = ctx;
  const spans = beginTextElement(ctx, value);
  const lines = value.split('\n');
  const ictx: InlineContext = {
    block: ctx,
    spans,
    cursor: { value: 0 },
  };
  return (
    <View key={key} style={styles.codeBlock}>
      {/* The header carries the copy control, so it renders even for an
          unlabeled fence rather than leaving those blocks uncopyable. The
          themed style supplies the border and padding; the local one the row. */}
      <View style={[styles.codeHeader, chrome.codeHeaderRow]}>
        <Text style={[chrome.codeHeaderLabel, styles.codeHeaderText]}>{language ?? ''}</Text>
        <CodeCopyButton tint={styles.codeHeaderText.color} value={value} />
      </View>
      <GestureScrollView
        horizontal
        nestedScrollEnabled
        persistentScrollbar
        showsHorizontalScrollIndicator>
        <View style={[styles.codeContent, scrollContentStyle]}>
          {lines.map((line, index) => {
            const pieces = renderLeaf(line, ictx);
            // The '\n' separating lines is part of the flattened text.
            if (index < lines.length - 1) ictx.cursor.value += 1;
            return (
              <Text key={index} selectable style={styles.codeLine}>
                {pieces.length ? pieces : ' '}
              </Text>
            );
          })}
        </View>
      </GestureScrollView>
    </View>
  );
}

function renderListItem(
  item: ListItem,
  marker: string,
  ctx: RenderContext,
  key: string | number,
): ReactNode {
  const { styles } = ctx;
  // The marker is a veil element of its own: a freshly streamed item must
  // dissolve in whole — a solid bullet floating over still-fading text reads
  // as a hole in the list.
  const span = beginTextElement(ctx, marker)[0];
  return (
    <View key={key} style={styles.listItem}>
      {span && span[2] < 1 ? (
        <VeilFade opacity={span[2]} remainingMs={span[3]}>
          <Text style={styles.listMarker}>{marker}</Text>
        </VeilFade>
      ) : (
        <Text style={styles.listMarker}>{marker}</Text>
      )}
      <View style={styles.listContent}>
        {item.children.map((child, index) => renderBlock(child, ctx, index))}
      </View>
    </View>
  );
}

function renderTable(
  node: Extract<RootContent, { type: 'table' }>,
  ctx: RenderContext,
  key: string | number,
): ReactNode {
  const { styles } = ctx;
  const [head, ...rows] = node.children;
  // Column count from the widest row, so a short row or a header is padded
  // rather than shifting the grid.
  const columns = Math.max(
    head?.children.length ?? 0,
    ...rows.map((row) => row.children.length),
    0,
  );
  if (columns === 0) return null;
  const cells = [...(head ? [head] : []), ...rows].map((row) =>
    Array.from({ length: columns }, (_, index) => flattenInline(row.children[index]?.children ?? '')),
  );
  // Every column asks for the width its own longest line needs, and the grid is
  // the sum of those — but only up to the transcript column's own width. A table
  // that fits keeps its natural columns; a wider one is fitted to the budget so
  // the cells wrap instead of demanding a long horizontal drag. Past the readable
  // floor (more columns than the width can hold) it still overflows and pans.
  const columnWidths = columnWidthsFor(cells, columns, tableBudget());
  const gridWidth = Math.max(TABLE_MIN_WIDTH, columnWidths.reduce((sum, w) => sum + w, 0));
  const renderRow = (
    row: (typeof node.children)[number],
    rowKey: string | number,
    isHead: boolean,
    isLast: boolean,
  ) => (
    <View
      key={rowKey}
      style={[
        styles.tableRow,
        isHead && styles.tableHeadRow,
        // The outer frame already draws the final rule, so the last row must
        // not double it.
        isLast && styles.tableRowLast,
      ]}>
      {Array.from({ length: columns }, (_, cellIndex) => {
        const cell = row.children[cellIndex];
        const textStyle = isHead ? styles.tableHeadText : styles.tableCellText;
        const align = node.align?.[cellIndex];
        // A cell the row does not reach stays blank but keeps its track, so a
        // ragged markdown row cannot knock the grid out of alignment.
        const flat = cell ? flattenInline(cell.children) : '';
        const ictx = inlineContext(ctx, flat);
        return (
          <View
            key={cellIndex}
            style={[
              styles.tableCell,
              // A definite width per column, shared by every row, so the
              // columns line up down the table.
              { width: columnWidths[cellIndex] ?? TABLE_MIN_WIDTH },
              cellIndex === columns - 1 && styles.tableCellLast,
            ]}>
            <Text
              selectable
              style={[textStyle, styles.tableNumerals, align ? { textAlign: align } : null]}>
              {cell ? renderInline(cell.children, ictx) : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
  return (
    <View key={key} style={styles.table}>
      {/* A table wider than the phone pans horizontally, keeping the column
          widths it was laid out with. */}
      <GestureScrollView
        horizontal
        nestedScrollEnabled
        persistentScrollbar
        showsHorizontalScrollIndicator>
        <View style={[styles.tableGrid, { width: gridWidth }]}>
          {head && renderRow(head, 'head', true, rows.length === 0)}
          {rows.map((row, index) => renderRow(row, index, false, index === rows.length - 1))}
        </View>
      </GestureScrollView>
    </View>
  );
}

export function renderBlock(
  node: RootContent | BlockContent | DefinitionContent,
  ctx: RenderContext,
  key: string | number,
): ReactNode {
  const { styles } = ctx;
  switch (node.type) {
    case 'paragraph':
      return renderParagraph(node.children, ctx, key);
    case 'heading': {
      const style = styles.heading[node.depth - 1] ?? styles.heading[5]!;
      const ictx = inlineContext(ctx, flattenInline(node.children));
      return (
        <Text key={key} selectable style={style}>
          {renderInline(node.children, ictx)}
        </Text>
      );
    }
    case 'code':
      return renderCode(node.value, node.lang ?? null, ctx, key);
    case 'blockquote':
      return (
        <View key={key} style={styles.blockquote}>
          {node.children.map((child, index) => renderBlock(child, ctx, index))}
        </View>
      );
    case 'list': {
      const start = node.start ?? 1;
      return (
        <View key={key} style={styles.list}>
          {node.children.map((item, index) => {
            const marker = item.checked != null
              ? item.checked ? '☑' : '☐'
              : node.ordered
                ? `${start + index}.`
                : '•';
            return renderListItem(item, marker, ctx, index);
          })}
        </View>
      );
    }
    case 'table':
      return renderTable(node, ctx, key);
    case 'thematicBreak':
      return <View key={key} style={styles.hr} />;
    case 'html': {
      // Raw HTML stays literal text, matching the desktop transcript.
      const ictx = inlineContext(ctx, node.value);
      return (
        <View key={key} style={styles.paragraph}>
          <Text selectable style={styles.body}>
            {renderLeaf(node.value, ictx)}
          </Text>
        </View>
      );
    }
    case 'definition':
    case 'footnoteDefinition':
      return null;
    default:
      return null;
  }
}
