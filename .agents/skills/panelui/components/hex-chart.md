# HexChart

A whole broken into parts, counted out in cells.

```tsx
import { HexChart } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { HexChart } from '@/components/ui/hex-chart';
```

### Anatomy

```tsx
<HexChart data={…}>
  <HexChart.Header />    {/* the strip above the field */}
  <HexChart.Skeleton />  {/* the undivided field, while it loads */}
  <HexChart.Cells />     {/* the honeycomb itself */}
  <HexChart.Tooltip />   {/* the press target, and the label it shows */}
  <HexChart.Legend />    {/* the key, under the field */}
</HexChart>
```

### Parts

- `HexChart.Header` — The strip above the field — what the chart is of, what it reads, and optionally a key for the colours. The chart introducing itself, as distinct from the caption on the card around it.
- `HexChart.Cells` — The honeycomb: the unfilled field, and one shape per series over it. One part rather than one per series — every cell shares a radius, a gap and a grid by definition, and a chart where one series' cells could be sized differently would be a chart drawing a lie.
- `HexChart.Tooltip` — The press target over the field, and the label naming what was pressed. The label hangs above the selected series rather than on it, so the cells being read are never underneath the thing reading them, and it sizes itself to its text rather than to a fixed box. Without this part the honeycomb is not pressable, though the legend still is.
- `HexChart.Legend` — The key: a swatch, a name and a share per series, under the field and across the width of it, wrapping rather than stacking. Pressable in the same way the cells are, and usually the easier target of the two. `Header legend` puts the same key in the header instead, which suits two or three short names and nothing longer.
- `HexChart.Skeleton` — The field with nothing divided up yet, while `status="loading"`. Deliberately undivided: placeholder shares would be an invented split, and a reader cannot tell an invented one from a real one until it changes under them.

### Props

#### `HexChartProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `data` | `HexDatum[]` | **required** | One entry per series. |
| `columns` | `number` | `21` | Cells across the field. The cell size follows from it and the measured width, so this is the one knob for how fine the honeycomb is. More cells resolve a smaller share — twenty-one across a phone is around two hundred and fifty in the field, so roughly a half a percent each — at the cost of every cell getting smaller and harder to press. |
| `aspectRatio` | `number` | `1.6` | Width over height of the field. |
| `density` | `number` | `0.55` | How much of the field the series fill, 0 to 1. Only meaningful with `shape="blob"`, where the unfilled cells are the margin the blob is read against; a `grid` fills every cell, because a waffle with a ragged last row is a waffle that has stopped being countable. |
| `shape` | `HexShape` | `blob` | How the filled cells are arranged. |
| `cellGap` | `number` | `0.14` | The gap between cells, as a share of the cell radius. Given as a share so the field keeps its proportions at whatever size it is measured at. |
| `animationDuration` | `number` | `620` | Milliseconds for the honeycomb to fill in. |
| `status` | `HexChartStatus` | `ready` | `loading` draws the field with nothing divided up yet. |
| `activeIndex` | `number` | — | Selected series. Leave unset to let the chart track it. |
| `onActiveIndexChange` | `(index: number) => void` | — | Fires with the selected series, or `-1` when the selection is cleared. |
| `children` | `ReactNode` | — | — |

#### `HexChartCellsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `emptyColor` | `string` | — | Colour of the cells no series took. Defaults to the muted token. |
| `dimOpacity` | `number` | — | Opacity of the series that are not selected, once one is. |

#### `HexChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `string` | — | — |

#### `HexChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number, series: HexDatum) => string` | — | Format the selected series' value. Defaults to a compact number. |
| `showCells` | `boolean` | — | Show the count of cells beside the share. |
| `className` | `string` | — | — |

#### `HexChartLegendProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `showValue` | `boolean` | — | Show each series' share of the whole beside its name. |

#### `HexChartHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | Small line above the value — what the chart is of. |
| `value` | `string` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `string` | — | One muted line under the value — a period, a comparison, a caveat. |
| `labels` | `Record<string, string>` | — | Prettier names for the series, keyed by their `label`. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per series along the trailing edge. For two or three short names. Past that use `HexChart.Legend`, which runs under the chart across the full width: a key of five long names crammed into the trailing corner of a header wraps to a column and leaves the title beside it a few points wide. |
| `children` | `ReactNode` | — | Trailing slot — a control, a badge, a range picker. Wins over `legend`. |

### Example — The data

A label and a value per series, and no maximum — the sum is the maximum. Negative values are treated as zero, because a share of a whole cannot be less than none of it.

```tsx
const attribution: HexDatum[] = [
  { label: 'Stir in strength', value: 3420 },
  { label: 'Healthier every day', value: 1880 },
  { label: 'Iron boost Q3', value: 840 },
  { label: 'Ambassador program', value: 610 },
];
```

### Notes

Cell counts are apportioned by largest remainder, so the parts add up to the budget exactly. Rounding each share on its own does not: three equal parts of a hundred round to 33 each and leave one over, and a spare cell in a honeycomb is not a rounding error a reader can shrug off — it is a cell of some colour that nothing in the data accounts for.

Every cell belonging to a series is concatenated into a single path, so a two-hundred-cell chart is six nodes rather than two hundred, whatever the cell count. That is also why the reveal is a growing clip rather than a per-cell stagger: the cells are no longer separate things to stagger. A blob is uncovered by an ellipse growing from the centre of the field, in the field's own proportions, so it arrives in the order it was filled in; a grid wipes across, for the same reason.

Selection is by press rather than by hover. There is no equivalent of a pointer resting somewhere without committing, so a chart that only revealed its numbers on hover would never reveal them at all.

The reveal runs once, when the data first arrives, and does not replay on every refresh — repeating it on each update turns a data change into an animation. Re-run it by hand through the ref's `replay()`, and it is skipped entirely under reduced motion.

---

Full page, with every example: https://panelui.dev/docs/charts/hex-chart
