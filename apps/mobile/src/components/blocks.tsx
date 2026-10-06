import { useEffect } from 'react';
import {
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
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';

/**
 * The house loading indicator: one rounded square that pulses, tinted with the
 * brand accent. It replaces the native `ActivityIndicator` everywhere a loader
 * marks "working", so every client shows the same brand-coloured motion.
 *
 * It was a 3x3 grid of squares shrinking and growing in a diagonal sweep
 * (loading.dev's `blocks`). That cost nine `useAnimatedStyle` subscriptions and
 * a three-deep view tree *per mounted loader*, which is what the sidebar paid:
 * one loader per running task row, each re-applying nine transforms on the UI
 * thread while the list scrolled. A single view keeps the same accent-coloured
 * "working" signal at a ninth of the per-frame cost, which matters because
 * loaders live on the scrolling surfaces (the task list, the transcript tail).
 *
 * One shared value drives it on the UI thread, so nothing runs on JS per frame.
 */

const DURATION = 1300;
/** Floor and ceiling of the pulse, as a scale. Wide enough to read as motion
 *  at 14px without the square disappearing. */
const MIN_SCALE = 0.55;
const MAX_SCALE = 1;

/** The pulse keyframe curve: shrink to `MIN_SCALE` by 35% of the cycle, back
 *  to `MAX_SCALE` by 70%, then hold — the timing the grid used, so the loader
 *  still breathes at the same rhythm. `ease-in-out` per segment, as the CSS. */
function pulseScale(phase: number) {
  'worklet';
  const easeInOut = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
  if (phase < 0.35) return MAX_SCALE - (MAX_SCALE - MIN_SCALE) * easeInOut(phase / 0.35);
  if (phase < 0.7) return MIN_SCALE + (MAX_SCALE - MIN_SCALE) * easeInOut((phase - 0.35) / 0.35);
  return MAX_SCALE;
}

export function Blocks({
  color,
  size = 20,
  style,
}: {
  /** Tint; defaults to the brand accent. */
  color?: ColorValue;
  /** Overall edge, in pixels. */
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

  const radius = size * 0.1875;
  const tint = color ?? theme.accent;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reducedMotion ? 0.8 : pulseScale(progress.value % 1) }],
  }));

  return (
    <Animated.View
      accessibilityRole="progressbar"
      style={[
        { backgroundColor: tint, borderRadius: radius, height: size, width: size },
        animatedStyle,
        style,
      ]}
    />
  );
}
