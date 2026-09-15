import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type PressableStateCallbackType,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Colors, StateLayer } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { splitPressableStyle } from '@/lib/pressable-host';

/**
 * Every pressable in the app. Android gets a real Material ripple instead of
 * the opacity fade a cross-platform default gives you, and every target picks
 * up Material's minimum touch padding — <Pressable> alone gives neither, and
 * hand-rolling it at sixty call sites let both drift.
 *
 * Pressed feedback belongs here, not downstream: an `opacity: pressed ? …`
 * in a style callback dims the label along with the surface, which reads as a
 * flicker rather than a touch, and fights the ripple on Android.
 *
 * Android ripple rounding: the native ripple is an unmasked full-bounds
 * drawable, and a view never clips its own background, so a rounded pressable
 * draws a square ripple unless a rounded `overflow: 'hidden'` PARENT clips it
 * (ReactViewGroup rounds dispatchDraw). When a style carries a borderRadius
 * and the ripple isn't `borderless`, this component inserts that clipping
 * host itself, splitting the style between the two views — see
 * `splitPressableStyle` for which key goes where and why.
 */
type AppPressableStyle =
  | StyleProp<ViewStyle>
  | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);

export interface AppPressableProps extends Omit<PressableProps, 'style'> {
  /** Reveal past the view's bounds — the circular ripple pill and round
   * buttons want, matching how Android draws borderless icon buttons. */
  borderless?: boolean;
  style?: AppPressableStyle;
}

/** Placement keys that must sit on the clip host, never on the pressable:
 * duplicated they would apply twice (margins don't collapse) or position the
 * pressable inside a collapsed wrapper (absolute offsets). They are moved,
 * not dropped — the host occupies the slot the pressable would have, so a
 * caller's spacing survives the extra view. */

/** The clip host around a rounded pressable, or undefined when the ripple
 * needs no rounding (no radius, borderless ripple, or off Android). */
function rippleHost(
  pressedStyle: StyleProp<ViewStyle>,
): { host: ViewStyle; inner: ViewStyle | undefined } | undefined {
  if (Platform.OS !== 'android' || pressedStyle == null) return undefined;
  const flat = StyleSheet.flatten(pressedStyle);
  const radius = flat?.borderRadius;
  if (radius == null || radius === 0) return undefined;
  return splitPressableStyle(flat, radius);
}

export function AppPressable({
  android_ripple,
  borderless = false,
  hitSlop = 8,
  style,
  ...props
}: AppPressableProps) {
  const theme = useTheme();
  const ripple = android_ripple ?? {
    borderless,
    color: theme === Colors.dark ? StateLayer.dark : StateLayer.light,
  };
  // Android already reports the touch through the ripple, so a downstream
  // `pressed ? 0.6 : 1` just dims the label on top of it and reads as a
  // flicker. iOS and web have no such affordance and keep the fade. The
  // resting state is cast because the environment disagrees on the callback
  // type: expo's react-native-web augmentation requires `hovered`, stock RN
  // types reject it.
  const restingState = { pressed: false } as unknown as PressableStateCallbackType;
  const pressedStyle = Platform.OS === 'android'
    ? (typeof style === 'function' ? style(restingState) : style)
    : style;
  // Only the resolved Android style needs the host; iOS/web keep the style
  // function so `pressed` opacity keeps working.
  const host = borderless
    ? undefined
    : rippleHost(pressedStyle as StyleProp<ViewStyle>);
  if (!host) {
    return (
      <Pressable
        android_ripple={ripple}
        hitSlop={hitSlop}
        style={pressedStyle as PressableProps['style']}
        {...props}
      />
    );
  }
  const { children, ...rest } = props as PressableProps & { children?: React.ReactNode };
  return (
    <View style={host.host}>
      <Pressable
        android_ripple={ripple}
        hitSlop={hitSlop}
        style={host.inner}
        {...rest}>
        {children}
      </Pressable>
    </View>
  );
}
