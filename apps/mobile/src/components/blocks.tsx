import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { Loader } from 'panelui-native/components/loader';

import { useTheme } from '@/hooks/use-theme';

/**
 * The house loading indicator, drawn by PanelUI's `Loader` with the
 * `morph-ring` variant: a square that rotates while its corners round off into
 * a circle and back.
 *
 * This keeps the `Blocks` name and its props, so the twenty-three call sites —
 * buttons, sheet bodies, the drawer's empty state, the connection banner — did
 * not have to move. What changed is the animation inside it: the house pulsing
 * square is gone, and every loader in the app now runs the library's ring.
 *
 * ## Why the size is not drawn exactly
 *
 * `Loader` scales through three named steps — `sm`, `md`, `lg`, being 0.75, 1
 * and 1.35 of a 34pt box — and `MorphRing` picks its border width at that
 * natural scale (`Math.max(2, 3 * scale)`). So a caller's exact points cannot
 * be honoured without scaling the finished ring with a transform, which would
 * take the border below a pixel at the small end and leave a hairline that
 * does not read as a ring at all. The requested size therefore selects the
 * nearest step: everything up to 20pt is `sm` (25.5pt), 22pt and above is `md`
 * (34pt). Sizes are coarser than they were; the ring is legible at each one,
 * which the exact-size version would not have been.
 *
 * Reduced motion is the library's own — it parks the ring on a representative
 * still frame rather than freezing it mid-turn.
 */
const MD_FROM = 22;

export function Blocks({
  color,
  size = 20,
  style,
  label = 'Working',
  speed,
}: {
  /** Tint; defaults to the brand accent. */
  color?: ColorValue;
  /** Requested edge in points. Selects the nearest `Loader` step — see above. */
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** What the ring means to a screen reader. Adjacent-text sites pass their own
   *  wording; the default keeps a bare "progressbar" from announcing itself
   *  with no name at all. */
  label?: string | null;
  /**
   * `Loader`'s own rate multiplier. Left undefined the ring loops forever,
   * which is right for something being waited on; `0` stops it and draws the
   * still frame, which is right for a mark that is only ever a position —
   * `EarlierIndicator` is the one such call site, and it mounts for every
   * transcript longer than the initial window.
   */
  speed?: number;
}) {
  const theme = useTheme();
  return (
    <Loader
      // Cast because `Loader` types its ink as a string while this prop is a
      // `ColorValue` — a `PlatformColor` (the native tint) has to pass
      // through, and the component resolves tokens by testing for a string
      // first, so a non-string is used as the colour verbatim.
      color={(color ?? theme.accent) as string}
      // Passed through rather than defaulted here: `Loader` already defaults a
      // missing label to "Loading", and this prop's own default is "Working".
      // Cast because `null` is the documented opt-out — `Loader` only applies
      // its default for `undefined`, so a `null` has to survive the trip to
      // mean "no announcement".
      label={label as string}
      size={size >= MD_FROM ? 'md' : 'sm'}
      // `Loader` spreads `ViewProps`, so the caller's own placement goes
      // straight onto its root rather than onto a wrapper view. This surface
      // sits on scrolling lists, where a loader per row is the norm, so the
      // extra view is worth not having.
      style={style}
      speed={speed}
      variant="morph-ring"
    />
  );
}
