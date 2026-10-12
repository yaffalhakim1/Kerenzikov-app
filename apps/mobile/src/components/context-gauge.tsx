import type { AgentSession } from '@waku/client';
import { Meter } from 'panelui-native/components/meter';
import type { MeterThreshold } from 'panelui-native/components/meter';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppPressable } from './app-pressable';
import { Sheet } from './sheet';
import type { Theme } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { contextUsagePercent } from '@/lib/session-presentation';
import { formatTokens } from '@/lib/usage-presentation';

/** Where "nearly full" starts, and where "full" does. One pair for the whole
 *  file: the header ring and the sheet's meter are the same reading, and two
 *  breakpoints would let them disagree about what almost-full looks like. */
const WARNING_AT = 80;
const DANGER_AT = 95;

/** PanelUI `Meter`'s colour judgement, in the app's own palette — the tokens
 *  it resolves to are the ones `gaugeColor` returns below. */
const FULL_THRESHOLDS: MeterThreshold[] = [
  { from: WARNING_AT, color: 'warning' },
  { from: DANGER_AT, color: 'destructive' },
];

/** Ring colour by how close the window is to full. */
function gaugeColor(percent: number, theme: Theme) {
  if (percent >= DANGER_AT) return theme.danger;
  if (percent >= WARNING_AT) return theme.warning;
  return theme.accent;
}

/**
 * Context-window meter, drawn as a ring so it reads at a glance next to the
 * header's other glyphs.
 *
 * A full ring is a full window. The track is always drawn, so an empty (or
 * unstarted) session still shows the ring's shape rather than nothing, which is
 * what makes the meter recognisable before it has anything to report.
 *
 * PanelUI has no ring glyph — its ring, `RingChart`, is a chart with its own
 * pressable arc, centre readout and legend, and hosting one here would put a
 * second pressable over the whole header target. The ring therefore stays
 * drawn by hand; everything else in this file's detail view is PanelUI's.
 */
function ContextGauge({ percent, size = 18 }: { percent: number; size?: number }) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const color = gaugeColor(clamped, theme);
  const strokeWidth = size >= 20 ? 2.5 : 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return (
    <View
      accessibilityLabel={`Context window ${clamped} percent full`}
      style={{ height: size, width: size }}>
      <Svg height={size} width={size}>
        <Circle
          cx={center}
          cy={center}
          fill="none"
          r={radius}
          stroke={theme.overlayStrong}
          strokeWidth={strokeWidth}
        />
        {clamped > 0 && (
          <Circle
            cx={center}
            cy={center}
            fill="none"
            r={radius}
            stroke={color}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - clamped / 100)}
            // Twelve o'clock start, so the ring fills clockwise from the top
            // the way a gauge is read.
            transform={`rotate(-90 ${center} ${center})`}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
          />
        )}
      </Svg>
    </View>
  );
}

/**
 * The ring as a control: tapping it opens the session's context detail, the
 * same numbers the desktop meter shows in its panel.
 *
 * A session with nothing measured yet still opens, reporting 0 over an empty
 * track, which is what the CLI's own panel does rather than hiding the row.
 */
export function ContextGaugeButton({
  usage,
  size = 18,
}: {
  usage: AgentSession['context_usage'];
  size?: number;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const percent = contextUsagePercent(usage);
  const tokens = usage?.tokens ?? 0;
  const window = usage?.window ?? null;

  // Matches the desktop panel's wording: a full "used / window (n%)" when both
  // numbers are known, and a bare token count when only occupancy is reported.
  const value = window !== null && percent !== null
    ? `${formatTokens(Math.min(tokens, window))} / ${formatTokens(window)} (${percent}%)`
    : formatTokens(tokens);

  return (
    <>
      <AppPressable
        accessibilityLabel={`Context window, ${value}. Open details.`}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}>
        <ContextGauge percent={percent ?? 0} size={size} />
      </AppPressable>

      <Sheet onDismiss={() => setOpen(false)} title="Context window" visible={open}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.text }]}>Context window</Text>
          <Text style={[styles.detailValue, { color: theme.textSecondary }]}>{value}</Text>
        </View>
        {/* The bar is PanelUI's meter, so the track, the fill and the colour
            judgement all come from the library rather than from here. The
            visible caption is the row above, hence the accessibility label
            instead of `label` — which would draw a second one. */}
        <View style={styles.detailMeter}>
          <Meter
            accessibilityLabel="Context window used"
            size="sm"
            thresholds={FULL_THRESHOLDS}
            value={percent ?? 0}
          />
        </View>
        <Text style={[styles.detailHint, { color: theme.textTertiary }]}>
          {percent === null
            ? 'This session has not reported a window size yet.'
            : `${100 - percent}% of the window is still free.`}
        </Text>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  detailLabel: { fontSize: 15, fontWeight: '500' },
  detailValue: { flexShrink: 1, fontSize: 13, fontVariant: ['tabular-nums'] },
  // The meter spans its container, so the inset is the wrapper's — a width of
  // its own plus margins would push it past the sheet's edge.
  detailMeter: { marginHorizontal: 20, marginTop: 10 },
  detailHint: {
    fontSize: 12.5,
    lineHeight: 18,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
});
