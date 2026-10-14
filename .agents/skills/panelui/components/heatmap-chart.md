# HeatmapChart

Contribution grid with a themed colour ramp and a readout.

```tsx
import { HeatmapChart } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { HeatmapChart } from '@/components/ui/heatmap-chart';
```

### Anatomy

```tsx
<HeatmapChart>
  <HeatmapChart.Header />     {/* the strip above the grid */}
  <HeatmapChart.XAxis />      {/* month labels, above the grid */}
  <HeatmapChart.YAxis />      {/* weekday labels, beside it */}
  <HeatmapChart.Separator />  {/* rules grouping the columns */}
  <HeatmapChart.Cells />      {/* the grid itself */}
  <HeatmapChart.Tooltip />    {/* the readout under the finger */}
  <HeatmapChart.Legend />     {/* the Less → More key, below */}
</HeatmapChart>
```

### Parts

- `HeatmapChart.Header` — The strip above the grid — what the chart is of, what it reads, and the ramp as a key. The place to put the key on a grid that scrolls sideways, where `Legend` would scroll away with the cells.
- `HeatmapChart.Cells` — The grid. Every row of every column is drawn, including the empty ones.
- `HeatmapChart.Separator` — Vertical rules grouping the columns — quarters, months, sprints.
- `HeatmapChart.XAxis` — Month labels above the grid, emitted where the month changes. Pass `labels` for columns that are not weeks.
- `HeatmapChart.YAxis` — Row labels beside the grid. Weekdays by default; pass `labels` for anything else.
- `HeatmapChart.Tooltip` — The readout that follows the finger across the grid.
- `HeatmapChart.Legend` — The `Less ▢▢▢▢▢ More` key, under the grid.

### Props

#### `HeatmapChartProps`

Extends `ViewProps, ChartAccessibilityProps<HeatmapCell>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `data` | `HeatmapColumn[]` | **required** | One column per period, with its row bins inside. |
| `layout` | `HeatmapLayout` | `fluid` | `fluid` draws cells at `binSize` and lets the grid be as wide as it needs to be — put it in a horizontal `ScrollView` for a full year. `fill` divides the available width between the columns instead. |
| `binSize` | `number` | `12` | Side of one cell in `fluid` layout, in pixels. |
| `gap` | `number` | `3` | Space between cells, in pixels. |
| `cornerRadius` | `number` | `2` | Corner radius of a cell. |
| `weekStartDay` | `number` | `0` | Which weekday is the top row. `0` is Sunday. Labels follow it. |
| `rows` | `number` | `7` | Rows per column. Seven for a calendar; use another number when the bins are not weekdays — twenty-four for a grid of hours. |
| `levels` | `number[]` | — | The four counts at which the ramp steps up. Derived from the data's own quartiles when omitted, so a chart of single digits and a chart of thousands both use the whole ramp. |
| `levelColors` | `string[]` | — | Five colours — empty, then the four activity levels. Replaces the derived ramp outright. Omit it and the ramp is `--color-chart-1` at five opacities, which follows the theme. |
| `color` | `string` | — | Base colour for the derived ramp — the colour the busiest cells are drawn in, with the quieter levels the same colour at lower opacity. Takes a theme token by name as well as a literal, so `"--color-chart-3"` recolours the chart and keeps following the theme through light and dark. Defaults to `--color-chart-1`. |
| `emptyColor` | `string` | — | Colour of a cell with nothing in it. Takes a token name too. Defaults to `--color-muted`, which is the right weight for "measured, and empty" — override it for a chart that should read as denser or fainter than that. |
| `levelOpacity` | `number[]` | — | Opacity of the base colour at each of the five levels, quietest first. The way to retune the ramp's contrast without having to name five colours. Ignored when `levelColors` is given, which sets the colours outright. |
| `animationDuration` | `number` | `900` | Milliseconds for the reveal on mount. |
| `inactiveOpacity` | `number` | `1` | Opacity of every cell that is not the one under the finger. |
| `onActiveCellChange` | `(cell: HeatmapCell \| null) => void` | — | The cell under the finger as it moves, and `null` when it lifts. This is how a readout above the chart gets its value — that readout is outside the chart, so it cannot use `useHeatmapChart`. |
| `children` | `ReactNode` | — | — |

#### `HeatmapCellsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `cornerRadius` | `number` | `2` | Corner radius of a cell. Falls back to the chart's. |

#### `HeatmapSeparatorProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `every` | `'quarter' \| number` | — | `quarter` draws a rule every thirteen columns; a number draws one every that many columns. |
| `color` | `string` | — | — |
| `dashArray` | `string` | — | Dash pattern, e.g. `"2,4"`. Omit for a solid rule. |

#### `HeatmapXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `formatLabel` | `(date: Date, column: number) => string` | — | Label a column. Given the first dated bin in it, so a month name can be derived. Return an empty string to leave the column unlabelled. |
| `labels` | `string[]` | — | Column labels, left to right. Overrides the month names — for a grid whose columns are not weeks, where there is no month to change and so nothing to emit a label on. |

#### `HeatmapYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `width` | `number` | `26` | Width reserved for the labels. The grid is sized around it. |
| `tickFilter` | `'all' \| 'odd' \| 'even'` | `odd` | Which rows get a label. Every other row is the usual choice. |
| `labelFormat` | `'initial' \| 'full'` | `full` | `initial` is the single letter; `full` is the abbreviated name. |
| `labels` | `string[]` | — | Row labels, top to bottom. Overrides the weekday names — for a grid whose rows are not days. |

#### `HeatmapTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `formatLabel` | `(cell: HeatmapCell) => string` | — | The line shown for a cell. Defaults to the count and the date. |
| `activateAfterLongPress` | `number` | `180` | How long a press has to be held before the readout takes over, in milliseconds. It is not zero, and cannot be: a full year of columns lives inside a horizontal scroller, and a readout that claims the touch on the first pixel of movement means the chart can never be scrolled. Holding first is what separates "I am moving the chart" from "I am reading it". Set `0` only for a chart that is not inside a scroll view at all. |

#### `HeatmapLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `lessLabel` | `string` | `Less` | Text at the low end of the ramp. |
| `moreLabel` | `string` | `More` | Text at the high end. |
| `swatchSize` | `number` | — | Side of a swatch, in pixels. Defaults to the chart's cell size. |

#### `HeatmapHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | Small line above the value — what the grid is of. |
| `value` | `string` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `string` | — | One muted line under the value — a period, a total, the held cell. |
| `legend` | `boolean` | `false` | Draw the ramp along the trailing edge, `Less ▢▢▢▢▢ More`. The key for a grid that scrolls sideways, where `HeatmapChart.Legend` under the cells would scroll away with them. |
| `lessLabel` | `string` | `Less` | Text at the low end of the ramp, when `legend` is set. |
| `moreLabel` | `string` | `More` | Text at the high end. |
| `children` | `ReactNode` | — | Trailing slot — a control, a badge, a range picker. Wins over `legend`. |

### Example — Building the calendar

Data arrives as dates and numbers; `buildHeatmapCalendar` does the bucketing — including the two parts that are easy to get wrong. It backs up to the first day of the week the range starts in, so every row lines up with a weekday for the rest of the chart, and it emits a cell for every day in the range whether or not there was an entry, because a calendar with holes in it stops being a calendar.

```tsx
const weeks = buildHeatmapCalendar(commits, {
  start: new Date(2025, 6, 23),
  end: new Date(2026, 6, 23),
  weekStartDay: 1,
});

<HeatmapChart data={weeks} weekStartDay={1}>
  <HeatmapChart.Cells />
</HeatmapChart>
```

### Notes

### The colour ramp

One colour at five opacities, not five colours. A heatmap reads as *more* and *less* of one thing, and five distinct hues read as five different things — which is what the `--color-chart-*` tokens are for, and why only the first of them is used here. The base is `--color-chart-1`, so the ramp follows the active theme.

There are four ways to change it, in rough order of how often you want them:

- **`color`** swaps the base. It takes a token by name — `color="--color-chart-3"` — as readily as a literal, and naming the token is almost always what you meant: a literal is a colour frozen at the moment it was written, and it cannot follow the theme into dark mode.
- **`emptyColor`** is the cell with nothing in it, `--color-muted` by default. Take it lighter or darker when "measured, and empty" should read differently from the surface around it.
- **`levelOpacity`** retunes the contrast between the five steps without naming five colours.
- **`levelColors`** replaces all five outright, for a ramp that is not one colour fading. The opacities are dropped then, since dimming a colour someone chose on purpose is not a ramp.

The four thresholds are the data's own quartiles by default, so a chart of single-digit counts and a chart of thousands both use the whole ramp. Zero is its own level and is left out of the quartiles — counting it drags every threshold to nothing on a sparse chart. Pass `levels` to fix them yourself.

### Reading a grid that is not a calendar

The tooltip's default label names contributions on a date, because that is what the cells usually are. A grid built from bins with no `date` gets the count on its own — it is not a calendar, so there is nothing to say after the number, and it is emphatically not "no data". Pass `formatLabel` to name what the cells actually count.

### Where the key goes

A grid that scrolls sideways has two places for its ramp and only one of them works. `Legend` sits under the cells, inside the scroller, and slides out of view with them; `Header legend` sits above the grid at the chart's own width and stays put. On a grid that fits, either is fine.

### Layout

The parts sit in a real layout rather than stacking over the plot: the labels are *beside* and *above* the grid and the legend is below it, so they take up room and the grid is sized with them accounted for. Only the cells and the rules are SVG — every label is a React Native view, because SVG text ignores the platform's text scaling and the theme's font.

### Reading a cell without hijacking the scroll

`HeatmapChart.Tooltip` waits for the press to be *held* before it claims the touch. It has to: a full year of columns lives inside a horizontal scroller, and a readout that takes over on the first pixel of movement means the chart can never be scrolled at all. Holding first is what separates “I am moving the chart” from “I am reading it”, and dragging from there moves the readout as usual.

`activateAfterLongPress={0}` gives the touch back immediately, for a chart that is not inside a scroll view and so has no scroll to protect.

The cell is resolved on the UI thread and only crosses into JS when it *changes*, so a drag across a year costs a handful of re-renders rather than one per frame.

### The reveal

Columns arrive left to right on mount, drawn by one clip rectangle wiping across the grid rather than by an animation per column. The effect is the same and it costs one animated value instead of fifty-two. It plays once; a data change redraws without replaying it, because repeating it turns a refresh into an animation. `useReducedMotion` skips it.

## Accessible data

The chart exposes one screen-reader summary and one semantic entry per data row; its SVG paths, axes and markers stay decorative. Set `accessibilityLabel` for a domain-specific summary, `accessibilityLabelForDatum` to format each row, and `onAccessibilityDatumPress` when selecting a row should perform an action. Pass `accessible={false}` only when the same data is already available nearby in an accessible table.

---

Full page, with every example: https://panelui.dev/docs/charts/heatmap-chart
