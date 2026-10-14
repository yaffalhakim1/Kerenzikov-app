# Meter

A measurement on a fixed scale, coloured by where it falls.

```tsx
import { Meter } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Meter } from '@/components/ui/meter';
```

### Usage

```tsx
<Meter value={68} label="Storage" showValueLabel />
```

### Variants

- **color** — `primary` *(default)*, `success`, `warning`, `destructive`, `info`, `muted`
- **size** — `sm`, `md` *(default)*, `lg`

### Props

#### `MeterProps`

Extends `Omit<ViewProps, 'children'>, MeterVariantProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `number` | **required** | The measurement. Values outside the scale are clamped to its ends. |
| `minValue` | `number` | `0` | The bottom of the scale — the value at which the bar reads as empty. Defaults to `0`. |
| `maxValue` | `number` | `100` | The top of the scale — the value at which the bar reads as full. Defaults to `100`, so a bare percentage needs neither bound set. |
| `label` | `string` | — | What is being measured. Also the accessibility label, and a meter without one announces a number with nothing attached to it — "seventy-five percent" of what is not an answer. Pass `accessibilityLabel` instead only where the caption is drawn some other way. |
| `showValueLabel` | `boolean` | `false` | Draw the value above the track, opposite the label. |
| `valueLabel` | `string` | — | Text for the value label. Overrides the formatted value — use it for a word where a number reads worse: `Strong`, `Almost full`. It is spoken whether or not it is drawn, so it can give a screen reader better words than the caption without changing the caption. Pair it with `showValueLabel` to draw it too. |
| `formatOptions` | `Intl.NumberFormatOptions` | — | How to write the value, through `Intl.NumberFormat`. A `percent` style formats how far up the scale the value sits; every other style formats the value itself, so `{ style: 'unit', unit: 'gigabyte' }` against a `maxValue` of `256` reads `64 GB` rather than a percentage of it. Falls back to a rounded percent when omitted. |
| `thresholds` | `MeterThreshold[]` | — | Points on the scale where the colour changes, each `{ from, color }`. The highest one the reading has reached wins, so the order you list them in does not matter; below all of them the `color` prop applies. Non-finite `from` values are ignored. This is the difference between a meter and a bar: the colour is a judgement about the reading. Which direction is bad is yours to say — thresholds climbing to `destructive` suit a disk filling up, thresholds falling to it suit a battery running down. |
| `segments` | `number` | — | Draw the scale as this many discrete blocks instead of one continuous bar. Blocks are all or nothing, which is the point of them: four blocks say "three out of four" where a bar says "about seventy percent", and a password is not seventy percent strong. Fractional counts round down and counts above 100 clamp to 100. Invalid, non-positive, or sub-one counts use the continuous bar. Any value above the floor lights at least one block, so a reading that is not empty never looks it. |
| `indicatorClassName` | `string` | — | Extra classes for the fill, or for a lit segment. |
| `headerClassName` | `string` | — | Extra classes for the label + value row. |

### Example — A scale in its own units

Set `maxValue` and the meter speaks in what is being measured. Nothing has to be converted to a percent on the way in, and the screen reader is told the real scale.

```tsx
<Meter
  value={168}
  maxValue={256}
  label="Storage"
  showValueLabel
  formatOptions={{ style: 'unit', unit: 'gigabyte' }}
/>
```

### Notes

`from` on a threshold is in the same units as `value`, not a percentage of the range — a threshold on a 0–8 GB meter is written in gigabytes. The highest finite one the value has reached wins, so the order you list them in does not matter. Below all of them, the `color` prop applies.

Values outside the scale clamp to its ends; NaN reads at the floor and infinities at the corresponding end. Non-finite bounds use the documented 0 and 100 defaults; an inverted or empty scale collapses at its finite floor and reads as empty. This keeps layout, animation, and native accessibility values finite and ordered.

Any reading above the floor lights at least one segment. Rounding down would leave the first quarter of a four-block meter dark, and “a little” looking like “none” is the reading a meter can least afford to get wrong.

Segments are all or nothing; a partly-filled block is not drawn. Fractional counts round down, counts above 100 clamp to 100, and invalid, non-positive, or sub-one counts use the continuous bar. If the value does not divide into whole blocks, use the continuous bar instead.

The fill is animated on the UI thread, so a value change costs one render and nothing per frame. Under the platform's reduce-motion setting it lands on the value rather than springing to it, and segments light without a fade. Motion, thresholds and segments never change the spoken value.

`valueLabel` is spoken whether or not it is drawn, so it can replace a number with clearer words such as “Strong”. Pair it with `showValueLabel` to draw it too; drawing it does not create another accessibility stop. `accessibilityLabel` overrides the visible `label` as the spoken name. Without either one the platform has no honest name to announce, so always provide one. Value updates refresh the node when rendered but are not live-region announcements, and this read-only meter does not expose adjustable actions.

---

Full page, with every example: https://panelui.dev/docs/components/meter
