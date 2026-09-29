import type { AgentSession } from '@waku/client';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppPressable } from './app-pressable';
import { Sheet } from './sheet';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { contextUsagePercent } from '@/lib/session-presentation';
import { formatTokens } from '@/lib/usage-presentation';

/** Ring colour by how close the window is to full. */
function gaugeColor(percent: number, theme: ReturnType<typeof useTheme>) {
  if (percent >= 95) return theme.danger;
  if (percent >= 80) return theme.warning;
  return theme.accent;
}

/**
 * Context-window meter, drawn as a ring so it reads at a glance next to the
 * header's other glyphs.
 *
 * A full ring is a full window. The track is always drawn, so an empty (or
 * unstarted) session still shows the ring's shape rather than nothing, which is
 * what makes the meter recognisable before it has anything to report.
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
  const fill = gaugeColor(percent ?? 0, theme);

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
        <View style={[styles.detailTrack, { backgroundColor: theme.overlayStrong }]}>
          <View
            style={[
              styles.detailFill,
              { backgroundColor: fill, width: `${percent ?? 0}%` },
            ]}
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
  detailTrack: {
    borderRadius: Radius.pill,
    height: 6,
    marginHorizontal: 20,
    marginTop: 10,
    overflow: 'hidden',
  },
  detailFill: { borderRadius: Radius.pill, height: 6 },
  detailHint: {
    fontSize: 12.5,
    lineHeight: 18,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
});
