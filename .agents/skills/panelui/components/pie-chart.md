# PieChart

One whole, divided between its parts.

```tsx
import { PieChart } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { PieChart } from '@/components/ui/pie-chart';
```

### Anatomy

```tsx
<PieChart data={…}>
  <PieChart.Header />      {/* the strip above the dial */}
  <PieChart.Skeleton />    {/* the undivided band, while it loads */}
  <PieChart.Slices />      {/* every slice, in data order */}
  <PieChart.Center />      {/* the readout in the hole */}
  <PieChart.Legend />      {/* the key, under the dial */}
</PieChart>
```

### Parts

- `PieChart.Header` — The strip above the dial — what the chart is of, what it reads, and optionally a key for the colours. The chart introducing itself, as distinct from the caption on the card around it.
- `PieChart.Slices` — Every slice, drawn in the order the data lists them. One part rather than one per datum: slices share a radius, a hole and a dial by definition, and a chart where one of them could be given a different radius would be a chart drawing a lie.
- `PieChart.Center` — The readout in the hole. Shows the total until a slice is selected, then that slice’s value and its share.
- `PieChart.Legend` — The key: a swatch, a name and a share per slice, under the dial and across the width of it, wrapping rather than stacking. Pressable in the same way the slices are, and usually the easier target of the two. `Header legend` puts the same key in the header instead, which suits two or three short names and nothing longer.
- `PieChart.Skeleton` — The dial as one plain band while `status="loading"`. Deliberately undivided: placeholder slices would be an invented split, and a reader cannot tell an invented one from a real one until it changes under them.

### Props

#### `PieChartProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `data` | `PieDatum[]` | **required** | One entry per slice, in the order they are drawn clockwise. |
| `size` | `number` | — | Fixed diameter in points. Measured from the container when omitted. |
| `innerRadius` | `number` | `0` | The hole, as a share of the radius. `0` is a pie; anything above it is a donut, and `0.55`–`0.65` is the range that leaves room for a readout in the middle without the band getting thin enough to be hard to hit. Given as a share rather than in points so a chart keeps its proportions at whatever size it is measured at. |
| `startAngle` | `number` | `0` | Where the first slice begins, in degrees clockwise from twelve o'clock. |
| `endAngle` | `number` | `360` | Where the last one ends, on the same clock. Leaving a turn's worth between the two gives a closed pie; anything less leaves a gap and reads as a dial. |
| `padAngle` | `number` | `0` | Gap between one slice and the next, in degrees. |
| `minAngle` | `number` | `0` | The smallest angle any non-zero slice is drawn at, in degrees. A slice worth a fifth of a percent is a hairline nobody can see and nobody can press, so it reads as missing rather than as small — and "missing" is a different claim from "nearly none". The angle it borrows comes off the others in proportion, so the turn still closes. |
| `animationDuration` | `number` | `620` | Milliseconds for the pie to unroll. |
| `status` | `PieChartStatus` | `ready` | `loading` draws a plain muted ring until the data arrives. |
| `activeIndex` | `number` | — | Selected slice. Leave unset to let the chart track it. |
| `onActiveIndexChange` | `(index: number) => void` | — | Fires with the selected slice, or `-1` when the selection is cleared. |
| `children` | `ReactNode` | — | — |

#### `PieChartSlicesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `cornerRadius` | `number` | `0` | Rounds the four turns of each slice, in points. |
| `popOut` | `number` | `6` | How far a selected slice lifts out of the pie, in points. |
| `dimOpacity` | `number` | `0.35` | Opacity of the slices that are not selected, once one is. |

#### `PieChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `string` | — | — |

#### `PieChartCenterProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultLabel` | `string` | `Total` | Heading shown when no slice is selected. |
| `formatValue` | `(value: number, slice: PieDatum \| null) => string` | — | Format the number under the label. Defaults to a compact number. |
| `children` | `(slice: PieDatum \| null) => ReactNode` | — | Draw the middle yourself. Given the selected slice, or `null` when nothing is selected. |
| `className` | `string` | — | — |

#### `PieChartLegendProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `showValue` | `boolean` | — | Show each slice's share of the whole beside its name. |

#### `PieChartHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | Small line above the value — what the chart is of. |
| `value` | `string` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `string` | — | One muted line under the value — a period, a comparison, a caveat. |
| `labels` | `Record<string, string>` | — | Prettier names for the slices, keyed by their `label`. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per slice along the trailing edge. For two or three short names. Past that use `PieChart.Legend`, which runs under the chart across the full width: a key of five long names crammed into the trailing corner of a header wraps to a column and leaves the title beside it a few points wide. |
| `children` | `ReactNode` | — | Trailing slot — a control, a badge, a range picker. Wins over `legend`. |

### Example — The data

A label and a value per slice, and no maximum — the sum is the maximum. Negative values are treated as zero, because a share of a whole cannot be less than none of it.

```tsx
const spend: PieDatum[] = [
  { label: 'Rent', value: 1450 },
  { label: 'Food', value: 620 },
  { label: 'Transport', value: 210 },
  { label: 'Utilities', value: 185 },
  { label: 'Everything else', value: 240 },
];
```

### Notes

### When not to reach for it

An angle is the hardest quantity to read off a page, and a pie asks the reader to compare several of them at once. It works for a handful of parts of one obvious whole — a budget, a disk, a split of traffic — and stops working somewhere around six or seven slices, where the small ones become a ring of slivers nobody can tell apart. Past that, sort the parts, take the top few, and put the rest in an “everything else” slice; or use a bar chart, where the comparison is a length and lengths are read exactly.

Anything measured against its own target rather than against the others is a [RingChart](/docs/charts/ring-chart), not a pie. Anything over time is a line or an area.

### Every slice is a share

The values are normalised against their sum, so they can be in any unit and any magnitude and the chart still closes the turn. There is no `maxValue` and no domain to set. A slice with a value of zero is drawn at no width at all — not at `minAngle`, which is a floor for things that *are* there.

### The hole is not decoration

`innerRadius` above zero exists so there is somewhere to put the total, and the total is what makes a pie readable. `PieChart.Center` limits itself to the square that fits inside the hole, so a small hole gets the number alone and a larger one gets a label and a caption with it.

### Selecting, and reaching

A slice can be pressed, but a slice worth two percent is not a touch target on a chart 208 points across. `PieChart.Legend` puts the same selection on a row of text, which is reachable at any share — prefer it, and treat pressing the dial itself as the shortcut rather than as the way in.

### Under reduce-motion

The unroll is skipped and the pie is simply there. The lift on a selected slice is a short tween and stays: it is a response to a press rather than an entrance, and without it there is nothing to say the press was received.

---

Full page, with every example: https://panelui.dev/docs/charts/pie-chart
