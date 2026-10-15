import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { Loader } from 'panelui-native/components/loader';

import { useTheme } from '@/hooks/use-theme';

/**
 * The house loading indicator: PanelUI's `Loader`, `bouncing-bars` variant, at
 * the library's `sm` step — the same mark everywhere, for everything that is
 * waited on.
 *
 * One variant and one size, deliberately. The loader appears next to an
 * `AppSymbol` glyph in a button as often as it stands alone on an empty screen,
 * and the previous ring at `md` measured 34pt against a 36pt button — bigger
 * than the control it was blocking. At `sm` the three bars are 20.25 × 22.5pt,
 * which reads inside a toolbar and still carries an empty screen.
 *
 * ## Why there is no `size`
 *
 * Call sites used to pass one, and the component snapped it to the nearest of
 * `Loader`'s three steps — so a requested 12pt and a requested 24pt landed two
 * steps apart and the app grew a loader for every context. One size ends that:
 * if a spot ever genuinely needs a bigger mark, that is a new component, not a
 * prop on this one.
 *
 * Reduced motion is the library's own — it parks the bars on a representative
 * still frame rather than freezing them mid-turn, which is why a mark that only
 * ever sits still (`EarlierIndicator`) passes `speed={0}` and stays drawn.
 */
export function Blocks({
  color,
  style,
  label = 'Working',
  speed,
}: {
  /** Tint; defaults to the brand accent. */
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  /** What the bars mean to a screen reader. Adjacent-text sites pass their own
   *  wording; the default keeps a bare "progressbar" from announcing itself
   *  with no name at all. */
  label?: string | null;
  /**
   * `Loader`'s own rate multiplier. Left undefined the bars loop forever,
   * which is right for something being waited on; `0` stops them and draws the
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
      size="sm"
      // `Loader` spreads `ViewProps`, so the caller's own placement goes
      // straight onto its root rather than onto a wrapper view. This surface
      // sits on scrolling lists, where a loader per row is the norm, so the
      // extra view is worth not having.
      style={style}
      speed={speed}
      variant="bouncing-bars"
    />
  );
}
