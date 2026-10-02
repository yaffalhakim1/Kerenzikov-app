import { useEffect } from 'react';
import {
  StyleSheet,
  View,
  type ColorValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';

/**
 * The house loading indicator: a 3x3 grid of squares that shrink to nothing
 * and grow back in a diagonal sweep (loading.dev's `blocks`). It replaces the
 * native `ActivityIndicator` everywhere a loader marks "working", so every
 * client shows the same brand-coloured motion.
 *
 * The whole grid is driven by one shared value read on the UI thread; each
 * block derives its own phase from the diagonal step, so nine blocks cost one
 * animation and nothing runs on the JS thread per frame.
 */

const SIDE = 3;
const SWEEP = SIDE * 2 - 1;
const DURATION = 1300;
const CELLS = Array.from({ length: SIDE * SIDE }, (_, index) => ({
  col: index % SIDE,
  row: Math.floor(index / SIDE),
}));

/** The blocks keyframe curve: scale 1 to 0 by 35% of the cycle, back to 1 by
 * 70%, then held. `ease-in-out` is applied per segment, as the CSS does. */
function blocksScale(phase: number) {
  'worklet';
  const easeInOut = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
  if (phase < 0.35) return 1 - easeInOut(phase / 0.35);
  if (phase < 0.7) return easeInOut((phase - 0.35) / 0.35);
  return 1;
}

function Block({
  cell,
  color,
  progress,
  radius,
  reducedMotion,
  step,
}: {
  cell: number;
  color: ColorValue;
  progress: SharedValue<number>;
  radius: number;
  reducedMotion: boolean;
  step: number;
}) {
  // A negative CSS `animation-delay`, expressed as a phase lead:
  // `(sweep - step) / sweep`.
  const lead = (SWEEP - step) / SWEEP;
  const animatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) return { transform: [{ scale: 0.8 }] };
    return { transform: [{ scale: blocksScale((progress.value + lead) % 1) }] };
  });
  return (
    <Animated.View
      style={[
        { backgroundColor: color, borderRadius: radius, height: cell, width: cell },
        animatedStyle,
      ]}
    />
  );
}

export function Blocks({
  color,
  size = 20,
  style,
}: {
  /** Tint; defaults to the brand accent. */
  color?: ColorValue;
  /** Overall grid edge, in pixels. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: DURATION, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [progress, reducedMotion]);

  const gap = size * 0.1;
  const cell = (size - gap * (SIDE - 1)) / SIDE;
  const radius = size * 0.0625;
  const tint = color ?? theme.accent;

  return (
    <View
      accessibilityRole="progressbar"
      style={[{ gap, height: size, width: size }, style]}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={[styles.row, { gap }]}>
          {CELLS.filter((cell) => cell.row === row).map(({ col }) => (
            <Block
              cell={cell}
              color={tint}
              key={`${row}-${col}`}
              progress={progress}
              radius={radius}
              reducedMotion={reducedMotion}
              step={row + col}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
});
