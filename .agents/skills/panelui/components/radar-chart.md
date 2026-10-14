# RadarChart

Several measures of one thing, drawn as one shape.

```tsx
import { RadarChart } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { RadarChart } from '@/components/ui/radar-chart';
```

### Anatomy

```tsx
<RadarChart data={…} axisKey="axis" domain={[0, 100]}>
  <RadarChart.Header title="…" value="…" />   {/* the strip above */}
  <RadarChart.Grid rings={4} />               {/* the scale */}
  <RadarChart.Axis />                         {/* the names round it */}
  <RadarChart.Series dataKey="you" />         {/* one profile */}
  <RadarChart.Series dataKey="team" fillOpacity={0} />
  <RadarChart.Legend />
</RadarChart>
```

### Parts

- `RadarChart.Header` — The strip above the rings — a caption, a headline figure, and optionally the legend on the trailing end.
- `RadarChart.Grid` — The scale, as rings. Polygonal by default; `circular` draws them as circles.
- `RadarChart.Axis` — The axis names, placed around the outside and anchored by which side of the circle they are on.
- `RadarChart.Series` — One profile. Filled by default; drop `fillOpacity` to `0` on the second and subsequent ones.
- `RadarChart.Legend` — The series, named and coloured, in the bottom-left corner of the plot — which on a radar is empty by construction.

### Props

#### `RadarChartProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `data` | `RadarChartDatum[]` | **required** | One row per axis, in the order they go round. |
| `axisKey` | `string` | `axis` | Key holding each row's axis label. |
| `status` | `RadarChartStatus` | `ready` | `loading` holds the shape at the centre until the data arrives, then grows it — one component throughout rather than a spinner swapped for a chart, because swapping loses the transition. |
| `size` | `number` | `180` | Diameter of the outermost ring, in points. The view is that plus the room the axis labels need around it, and centres itself. The ring rather than the box, because the ring is the thing being sized — a box measurement would mean "bigger" also meant "labels further from the shape", and the chart would grow without the drawing growing with it. Pass `size={undefined}` with an `aspectRatio` to fill the container the way the other charts do. |
| `aspectRatio` | `number` | `1` | Width ÷ height when `size` is not given. `1` is the square a radar wants; the rings stay circular whatever it is set to. |
| `domain` | `[number, number]` | — | Fix the scale instead of deriving it from the data. A radar almost always wants this: the shape only means something against a known maximum, and a scale that moves with the data makes two charts incomparable. |
| `animationDuration` | `number` | `620` | Milliseconds for the reveal on mount. |
| `compact` | `boolean` | `false` | Drop the room reserved for axis labels, for a radar with none. |
| `children` | `ReactNode` | — | — |
| `accessibilityLabelForDatum` | `ChartAccessibilityProps<RadarChartDatum>['accessibilityLabelForDatum']` | — | Accessible data labels and optional activation for each axis row. |
| `onAccessibilityDatumPress` | `ChartAccessibilityProps<RadarChartDatum>['onAccessibilityDatumPress']` | — | — |

#### `RadarChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rings` | `number` | `4` | How many rings, including the outermost. |
| `color` | `string` | — | Overrides the themed hairline colour. |
| `circular` | `boolean` | `false` | Draw the rings as circles rather than as polygons through the spokes. |
| `spokes` | `boolean` | `true` | Draw a line from the centre out to each axis. |

#### `RadarChartAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `string` | — | Overrides the themed label colour. |
| `fontSize` | `number` | — | Label size in points. |
| `offset` | `number` | — | How far outside the rings the labels sit. |
| `formatLabel` | `(label: string, index: number) => string` | — | Rewrites a label — to shorten it, or to add a unit. |

#### `RadarChartSeriesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dataKey` | `string` | **required** | Key holding this series' value on each row. |
| `name` | `string` | — | Name for the legend. Defaults to `dataKey`. |
| `color` | `string` | — | Stroke colour. Defaults to the `--color-chart-*` token at `colorIndex`, so a series follows the theme without the call site naming a colour. |
| `colorIndex` | `SeriesColorIndex` | `1` | Which `--color-chart-*` token to take when `color` is not given. |
| `strokeWidth` | `number` | `2` | — |
| `fillOpacity` | `number` | `0.18` | Opacity of the fill. Two filled polygons over each other make a third colour that means nothing, so drop it towards `0` — or to `0` — on the second and subsequent series. |
| `showDots` | `boolean` | `false` | A dot at each vertex. Worth it on a radar with few axes. |

#### `RadarChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | Small caption above the value. |
| `value` | `string` | — | The headline figure, if there is one. |
| `caption` | `string` | — | A line under the value. |
| `legend` | `boolean` | `false` | Draw the series legend on the trailing end of the strip. |
| `children` | `ReactNode` | — | — |

#### `RadarChartLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `formatName` | `(key: string) => string` | — | Rewrites a series' name — the key is rarely what a reader should see. |

### Example — The data

One row per axis, in the order they go round, with one key per series. `axisKey` names the column holding each row’s label; it defaults to `axis`.

```tsx
const profile: RadarChartDatum[] = [
  { axis: 'Speed', you: 82, team: 64 },
  { axis: 'Accuracy', you: 71, team: 78 },
  { axis: 'Coverage', you: 55, team: 83 },
  { axis: 'Uptime', you: 94, team: 91 },
  { axis: 'Cost', you: 48, team: 62 },
];
```

### Notes

Three axes is the minimum — two spokes are a line, not a shape — and past about eight the labels start colliding and the outline stops being readable as one form. Five or six is where this chart works.

### Changing the data

The shape travels rather than jumping. Each vertex is tweened from where it was to where it is going over 420ms, and a switch made part way through another one carries on from the outline actually on screen rather than snapping back to start again.

Fixing `domain` matters most here. With a derived scale the rings move at the same moment the shape does, and a profile that got better looks identical to one that got worse.

### The reveal

The polygons grow out of the centre rather than sweeping across, because a polar chart has no left-hand edge for a sweep to start from. It scales the **values**, not the group: a `scale` transform would grow the stroke and the dots along with the shape and arrive at the wrong stroke width.

It plays once on mount. `replay()` on the ref runs it again. Under *Reduce Motion* the shape is simply there.

### It sizes itself

Every other chart here fills its container. This one does not, and the reason is that it is square: filling a panel makes a radar as tall as the panel is wide, which is twice the height of the wide chart beside it for the same five or six numbers. It takes a 180pt ring and centres. `size` moves that; `size={undefined}` with an `aspectRatio` goes back to filling the width.

### Space for the labels

Axis labels are horizontal text sitting outside a circle, which is why the view is **wider than it is tall**: the label at three o'clock needs its whole width to the right of the ring, while the one at twelve needs a single line above it. A square box either clips the sides or wastes the top and bottom.

SVG clips at its viewport and does not reflow, so a label with nowhere to go would lose its tail with nothing to show it ever had one. The anchor is pulled back inside the view before drawing, which costs a couple of points of gap and is the cheaper of the two. For labels long enough to still crowd the shape, shorten them with `formatLabel` — and pass `compact` to reclaim the room entirely on a radar with no labels at all.

### Colour

Series take the `--color-chart-*` tokens through `colorIndex`, the same ramp every other chart here uses, so the first series is the same colour as the first series on the chart beside it. The rings read `--color-border` and the labels `--color-muted-foreground`.

## Accessible data

The chart exposes one screen-reader summary and one semantic entry per data row; its SVG paths, axes and markers stay decorative. Set `accessibilityLabel` for a domain-specific summary, `accessibilityLabelForDatum` to format each row, and `onAccessibilityDatumPress` when selecting a row should perform an action. Pass `accessible={false}` only when the same data is already available nearby in an accessible table.

---

Full page, with every example: https://panelui.dev/docs/charts/radar-chart
