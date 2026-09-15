import type { ViewStyle } from 'react-native';

/**
 * Splitting a pressable's style between the clip host and the pressable.
 *
 * Android's ripple is an unmasked full-bounds drawable and a view never clips
 * its own background, so a rounded pressable draws a square ripple unless a
 * rounded `overflow: 'hidden'` parent clips it. `AppPressable` inserts that
 * parent, which means one style has to be divided between two views:
 *
 *   - placement keys belong to the HOST, because the host is the sibling its
 *     parent lays out. Left on the pressable they would either apply twice
 *     (margins do not collapse) or position it inside an already-positioned
 *     wrapper.
 *   - sizing keys are MIRRORED, so the host occupies the slot the pressable
 *     would have while the pressable still fills it.
 *   - everything else stays on the pressable.
 *
 * Kept free of React Native imports so the split is unit-testable; the caller
 * passes a flattened style and receives plain objects.
 */

/** Placement keys that move onto the clip host. */
export const HOST_ONLY_KEYS = [
  'position',
  'top',
  'left',
  'right',
  'bottom',
  'zIndex',
  'margin',
  'marginHorizontal',
  'marginVertical',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginStart',
  'marginEnd',
  'aspectRatio',
] as const;

/** Sizing keys mirrored onto the clip host so it occupies the same slot. */
export const HOST_MIRROR_KEYS = [
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
] as const;

export interface SplitPressableStyle {
  host: ViewStyle;
  inner: ViewStyle;
}

/** Divide a flattened pressable style into the clip host's and the
 *  pressable's. `radius` is the caller-resolved borderRadius, which React
 *  Native allows to be a string on some platforms, so the host copies it
 *  verbatim rather than assuming a number. */
export function splitPressableStyle(
  flat: ViewStyle,
  radius: ViewStyle['borderRadius'],
): SplitPressableStyle {
  const host: Record<string, unknown> = { borderRadius: radius, overflow: 'hidden' };
  for (const key of HOST_MIRROR_KEYS) {
    const value = flat[key as keyof ViewStyle];
    if (value != null) host[key] = value;
  }
  const inner: Record<string, unknown> = { ...flat };
  // Placement moves to the host rather than vanishing with the key. The host
  // is what the parent lays out, so a key dropped here is spacing the caller
  // asked for and silently never got.
  for (const key of HOST_ONLY_KEYS) {
    const value = flat[key as keyof ViewStyle];
    if (value != null) host[key] = value;
    delete inner[key];
  }
  return { host: host as ViewStyle, inner: inner as ViewStyle };
}
