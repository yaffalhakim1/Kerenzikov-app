# FunnelChart

Where a population drained away, one step at a time.

```tsx
import { FunnelChart } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { FunnelChart } from '@/components/ui/funnel-chart';
```

### Anatomy

```tsx
<FunnelChart data={…}>
  <FunnelChart.Header />      {/* the strip above the run */}
  <FunnelChart.Skeleton />    {/* the plain ribbon it waits behind */}
  <FunnelChart.Stages />      {/* the ribbon itself */}
  <FunnelChart.Labels />      {/* the count, the pill and the name, per stage */}
  <FunnelChart.Legend />      {/* a key underneath, for a chart without labels */}
</FunnelChart>
```

### Parts

- `FunnelChart.Header` — The strip above the run — what the funnel is of, what it reads, and room for a control. The chart introducing itself, as distinct from the caption on the card around it.
- `FunnelChart.Stages` — The ribbon. One part rather than one per stage: a stage’s near edge is the previous stage’s far edge, so they cannot be configured apart without the shape coming apart with them. Each band is drawn concentrically, from a wide faint ring to a tight near-solid core.
- `FunnelChart.Labels` — The readings, arranged around the ribbon: the count above the band, the name under it, and the conversion in a pill on the band itself. Three places rather than one line, because a name, a count and a percentage sharing a row make a row as wide as all three — and at the width a phone has, it is the name that gives way.
- `FunnelChart.Legend` — A swatch, a name and a reading per stage, under the run. For a compact chart drawn without `Labels`, where the run is a shape and the reading is underneath it. A row each by default, because the stages are a sequence and a wrapped centred line loses the order.
- `FunnelChart.Skeleton` — The waiting state: one plain ribbon over the whole run, undivided. A placeholder split would be an invented drop-off, and nobody can tell an invented one from a real one until it changes under them.

### Props

#### `FunnelChartProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `data` | `FunnelDatum[]` | **required** | The steps, in the order they happen. Never reordered. |
| `height` | `number` | `200` | How tall the run is drawn, in points. The run is as wide as it is given and as deep as this: the width is the card's, but nothing in the data says how far the ribbon should taper through, so it is a decision rather than a measurement. |
| `stageSize` | `number` | — | How wide one stage is, in points. Left unset the stages divide the width between them, which is nearly always what a run across a card wants. Worth setting only to make a run stop short of the edge. |
| `gap` | `number` | `4` | Space between one stage and the next, in points. |
| `layers` | `number` | `3` | Concentric rings drawn per stage, faint and wide on the outside through to a near-solid core. `1` draws the band once, flat. |
| `edges` | `FunnelEdges` | `curved` | Whether the sides of a band are curves or straight diagonals. |
| `minWidth` | `number` | `0.1` | The shortest a non-zero stage is drawn, as a share of the tallest. A stage worth a fifth of a percent of the first is a hairline: it reads as missing rather than as small, and "missing" is a different claim. The floor is only applied to stages that have something in them — a genuine zero is drawn as nothing, because there it is the truth. |
| `color` | `string` | — | The funnel's hue. Defaults to the first chart token. |
| `animationDuration` | `number` | `700` | Milliseconds for one stage to grow. |
| `staggerDelay` | `number` | `90` | Milliseconds between one stage starting and the next. `0` for all at once. |
| `status` | `FunnelChartStatus` | `ready` | `loading` draws one plain muted ribbon until the data arrives. |
| `activeIndex` | `number` | — | Selected stage. Leave unset to let the chart track it. |
| `onActiveIndexChange` | `(index: number) => void` | — | Fires with the selected stage, or `-1` when the selection is cleared. |
| `children` | `ReactNode` | — | — |

#### `FunnelChartStagesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dimOpacity` | `number` | — | Opacity of the stages that are not selected, once one is. |

#### `FunnelChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `string` | — | — |

#### `FunnelChartLabelsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `formatValue` | `(value: number, stage: FunnelDatum) => string` | — | Format the count. Defaults to a compact number. |
| `formatShare` | `(share: number, stage: FunnelDatum) => string` | — | Format the conversion in the pill. Defaults to a whole percent. |
| `share` | `FunnelShare` | `top` | Which conversion the pill reports. `top` is the share of the first stage, which every stage has and which reads along the run as one falling series. `previous` is the drop from the stage above — the step-by-step reading, where the first stage has nothing above it and so carries no pill. |
| `showValue` | `boolean` | `true` | Show the count above the ribbon. |
| `showLabel` | `boolean` | `true` | Show the stage's name under the ribbon. |

#### `FunnelChartLegendProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `layout` | `FunnelLegendLayout` | `list` | `list` gives every stage a row of its own, with the names down one column and the numbers down another. `inline` runs them together across the width and wraps, which is the denser arrangement where the names are short. |
| `showValue` | `boolean` | `true` | Show each stage's reading beside its name. |
| `formatValue` | `(value: number, stage: FunnelDatum) => string` | — | Format the value in a `list` key. Defaults to a compact number. |

#### `FunnelChartHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | Small line above the value — what the funnel is of. |
| `value` | `string` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `string` | — | One muted line under the value — a period, a comparison, a caveat. |
| `children` | `ReactNode` | — | Trailing slot — a control, a badge, a range picker. |

### Example — The data

Steps in the order they happen, first one first. The order is yours and never the chart’s — stages are a process, and sorting them by size would destroy the only thing the chart is asserting.

Keep the names short. A stage gets a column of the card’s width and no more, so five across a phone is about seventy points each, and a name that does not fit under one is a name the reader never gets to read.

```tsx
const checkout: FunnelDatum[] = [
  { label: 'Viewed', value: 41800 },
  { label: 'Basket', value: 18240 },
  { label: 'Checkout', value: 9420 },
  { label: 'Payment', value: 6180 },
  { label: 'Paid', value: 5240 },
];
```

### Notes

### Why the readings are split three ways

A stage has three things worth saying about it — what it is called, how many were left at it, and what it converted at — and putting all three on one line makes that line as wide as all three together. At the width a phone actually has, something has to give, and it is always the name: a reader is left with “Checkout st…” next to a number that means nothing without it.

So the count goes above the band, the name under it, and the conversion in a pill on the band itself. Each has the stage’s whole column to itself. The two text strips take a fixed share of the height and the ribbon takes the rest, centred in it, so the tallest stage reaches exactly to the words at both ends — no strip of nothing between the shape and the text, and no shape creeping under it.

The pill is filled rather than bare text for the same reason: it is the one reading that sits *over* the shape, where the fill behind it is the same token family the text would be drawn in. Punched out of its own background, it reads whatever the band is doing underneath.

### One hue, not five

The stages are drawn in a single colour that fades along the run. They are one quantity at successive moments, not five unrelated series, and five hues would say they were — the reader would start looking for what “the green one” means. Set `color` on the chart to change the hue, or `color` on a single stage to pull it out of the fade at full strength.

### A stage larger than its parent

Heights are measured against the largest value in the run rather than against the first. In a well-formed funnel those are the same number. Where they are not — a stage that somehow counted more people than the step before it — the stage is drawn as given, taller than its parent, because that is a real data problem and a chart that quietly clamped it would be hiding the one thing worth seeing.

### When not to reach for it

A funnel asserts that each stage is a subset of the one above it. If that is not true of your data — categories that merely happen to be sorted, quantities measured at the same moment, anything a reader might want to compare exactly — it is a bar chart, where the comparison is a length and lengths are read exactly. Four to six stages is the range a funnel reads well in; past that the columns are too narrow to name and the lower stages are all floor.

---

Full page, with every example: https://panelui.dev/docs/charts/funnel-chart
