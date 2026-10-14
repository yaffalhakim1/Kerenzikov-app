# PolarAreaChart

Several readings on one scale, compared as wedges.

```tsx
import { PolarAreaChart } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { PolarAreaChart } from '@/components/ui/polar-area-chart';
```

### Anatomy

```tsx
<PolarAreaChart>
  <PolarAreaChart.Header />     {/* title and reading, above the dial */}
  <PolarAreaChart.Grid />       {/* the rings the wedges are read against */}
  <PolarAreaChart.Wedges />     {/* the wedges */}
  <PolarAreaChart.Skeleton />   {/* while status="loading" */}
  <PolarAreaChart.Labels />     {/* the reading on each wedge with room for it */}
  <PolarAreaChart.Tooltip />    {/* readout for the selected wedge */}
  <PolarAreaChart.Legend />     {/* swatches and readings, under the dial */}
</PolarAreaChart>
```

### Parts

- `PolarAreaChart.Header` — The strip above the dial — what the chart is of, what it reads, and optionally a key for the colours.
- `PolarAreaChart.Grid` — The rings. Each one stands for an even step of the value and sits where that value falls, which under `scale="area"` is not an even step of the radius.
- `PolarAreaChart.Wedges` — The wedges. One part rather than one per datum: they share a dial, a maximum and a scale, and a wedge with its own maximum would be drawing a lie.
- `PolarAreaChart.Labels` — The reading on each wedge, as real text over the SVG. Wedges too short to hold one are left blank.
- `PolarAreaChart.Tooltip` — The readout for the selected wedge. This is how the short ones are named.
- `PolarAreaChart.Legend` — A swatch, a name and a reading per wedge, under the dial. Pressable in the same way the wedges are.
- `PolarAreaChart.Skeleton` — The dial as one plain disc, shown while `status="loading"`.

### Props

#### `PolarAreaChartProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `data` | `PolarAreaDatum[]` | **required** | One entry per wedge, drawn in the order they are listed. |
| `size` | `number` | — | Diameter in points. Left out, the chart fills its column as a square. |
| `maxValue` | `number` | — | The value the outermost ring stands for. Defaults to the largest value rounded up to a round number. Fix it to compare two dials against each other — the same reading has to be the same distance out on both, and a maximum derived per chart makes the largest wedge of each one reach the edge whatever it is worth. |
| `scale` | `PolarAreaScale` | `radius` | Whether the radius or the area carries the value. |
| `startAngle` | `number` | `0` | Where the first wedge starts, in degrees clockwise from twelve o'clock. |
| `padAngle` | `number` | `0` | Gap between wedges, in degrees. |
| `status` | `PolarAreaChartStatus` | `ready` | `loading` draws the dial undivided, with nothing split up yet. |
| `animationDuration` | `number` | `620` | Milliseconds for the wedges to grow out of the centre. |
| `activeIndex` | `number` | — | The selected wedge, to drive the selection from outside. |
| `onActiveIndexChange` | `(index: number) => void` | — | — |
| `children` | `ReactNode` | — | — |

#### `PolarAreaChartWedgesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `cornerRadius` | `number` | `0` | Rounds the four turns of each wedge, in points. |
| `dimOpacity` | `number` | `0.35` | Opacity of the wedges that are not selected, once one is. |

#### `PolarAreaChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rings` | `number` | — | How many rings, including the outermost. |
| `color` | `string` | — | Overrides the themed hairline colour. |
| `spokes` | `boolean` | — | Draw a line from the centre out along each wedge's edge. |

#### `PolarAreaChartLabelsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number, datum: PolarAreaDatum) => string` | — | Format the value. Defaults to a compact number. |
| `minRadius` | `number` | `34` | Wedges reaching less far than this, in points, are left unlabelled. |
| `className` | `string` | — | — |

#### `PolarAreaChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number, datum: PolarAreaDatum) => string` | — | Format the value. Defaults to a compact number. |
| `className` | `string` | — | — |

#### `PolarAreaChartLegendProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `showValue` | `boolean` | `true` | Show each wedge's reading beside its name. |
| `formatValue` | `(value: number, datum: PolarAreaDatum) => string` | — | Format the value. Defaults to a compact number. |

#### `PolarAreaChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `string` | — | — |

#### `PolarAreaChartHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | Small line above the value — what the chart is of. |
| `value` | `string` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `string` | — | One muted line under the value — a period, a comparison, a caveat. |
| `labels` | `Record<string, string>` | — | Prettier names for the wedges, keyed by their `label`. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per wedge along the trailing edge. For two or three short names. Past that use `PolarAreaChart.Legend`, which runs under the dial across the full width. |
| `children` | `ReactNode` | — | Trailing slot — a control, a badge, a range picker. Wins over `legend`. |

### Example — Readings on one scale

Equal angles, and the radius carries the value. The rings are the scale — four of them by default, the outermost standing for `maxValue`.

```tsx
<PolarAreaChart data={latency}>
  <PolarAreaChart.Header title="p95 response time" caption="Across six regions, in ms" />
  <PolarAreaChart.Grid />
  <PolarAreaChart.Wedges cornerRadius={4} />
  <PolarAreaChart.Labels />
  <PolarAreaChart.Legend />
</PolarAreaChart>
```

### Notes

Every wedge takes the same angle, and there is no prop to change that. The angle and the radius moving together would be two quantities in one mark, with no way to read either.

`maxValue` defaults to the largest value rounded up to a round number, so the outermost ring lands on 150 rather than on 147. Set it by hand to compare two dials.

There are five chart colour tokens. Past the fifth wedge the palette is walked again a tone further along rather than repeated, so no two wedges are the same colour — a chart whose job is telling parts apart cannot hand two of them one colour. Give a wedge its own `color` to override this.

A wedge shorter than `minRadius` is left unlabelled by `Labels` — the number would sit outside the wedge it belongs to, beside a neighbour it does not describe. Those are read through `Tooltip` and the legend, which is the reason to include one of them.

Labels take their colour from the wedge under them, white on a dark one and near-black on a light one. Chart colours come from the theme and can land anywhere on the scale.

Negative values are treated as zero. There is no distance shorter than none, and scaling around it would misstate every other wedge.

---

Full page, with every example: https://panelui.dev/docs/charts/polar-area-chart
