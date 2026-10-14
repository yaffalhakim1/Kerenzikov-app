# TreemapChart

A total, cut into the parts it is made of, sized by area.

```tsx
import { TreemapChart } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { TreemapChart } from '@/components/ui/treemap-chart';
```

### Anatomy

```tsx
<TreemapChart>
  <TreemapChart.Header />                {/* title and total, above the box */}
  <TreemapChart.Tiles />                 {/* the rectangles */}
  <TreemapChart.Skeleton />              {/* while status="loading" */}
  <TreemapChart.Labels />                {/* names, on the tiles with room */}
  <TreemapChart.Tooltip />               {/* readout for the selected tile */}
  <TreemapChart.Legend />                {/* swatches, under the box */}
</TreemapChart>
```

### Parts

- `TreemapChart.Header` — The strip above the box — what the total is of, and what it reads.
- `TreemapChart.Tiles` — The rectangles. One part rather than one per datum: a tile’s box is decided by every tile before it in its row.
- `TreemapChart.Labels` — Names and readings, as real text over the tiles that have room for them.
- `TreemapChart.Tooltip` — The readout for the selected tile. This is how the small ones are read.
- `TreemapChart.Legend` — A swatch and a name per tile, under the box. Pressable in the same way the tiles are.
- `TreemapChart.Skeleton` — The box undivided, with a sweep across it, shown while `status="loading"`.

### Props

#### `TreemapChartProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `data` | `TreemapDatum[]` | **required** | The parts of the total, in any order. Sorted by the chart unless told not to. |
| `aspectRatio` | `number` | `1.4` | Width ÷ height of the box the tiles fill. |
| `gap` | `number` | `3` | Space between one tile and the next, in points. |
| `cornerRadius` | `number` | `6` | Corner radius of a tile, in points. |
| `sort` | `boolean` | `true` | Sort the tiles largest first. On by default, and worth leaving on. The row test assumes a descending run — given a large tile next to a small one it has no good row to make, and the chart comes out as slivers. Turn it off only where the given order is itself the message. |
| `maxTiles` | `number` | — | Keep the largest `maxTiles` and gather the rest into one. A phone-width treemap runs out of legible tiles somewhere around twenty. Past that the tail is texture, and one tile that says how much the tail is worth is more use than forty that cannot be read or hit. |
| `otherLabel` | `string` | `Other` | What the gathered tile is called. |
| `color` | `string` | — | The ramp's hue. Defaults to the first chart token. |
| `minLabelSize` | `number` | `48` | Smallest side, in points, a tile needs before `Labels` writes on it. A name clipped to two letters is not a shorter name, it is a different word. Tiles under this are left blank and read through the readout. |
| `animationDuration` | `number` | `520` | Milliseconds for one tile to grow. |
| `staggerDelay` | `number` | `26` | Milliseconds between one tile starting and the next. `0` for all at once. |
| `status` | `TreemapChartStatus` | `ready` | `loading` draws the box undivided until the data arrives. |
| `activeIndex` | `number` | — | Selected tile, indexed as laid out. Leave unset to let the chart track it. |
| `onActiveIndexChange` | `(index: number) => void` | — | Fires with the selected tile, or `-1` when the selection is cleared. |
| `children` | `ReactNode` | — | — |

#### `TreemapChartTilesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dimOpacity` | `number` | — | Opacity of the tiles that are not selected, once one is. |

#### `TreemapChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `duration` | `number` | — | Milliseconds for one pass of the sweep. |
| `color` | `string` | — | — |

#### `TreemapChartLabelsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `showValue` | `boolean` | `true` | Show each tile's value under its name. |
| `showShare` | `boolean` | `false` | Show each tile's share of the total under its name. |
| `formatValue` | `(value: number, tile: TreemapTile) => string` | — | Format the value. Defaults to a compact number. |
| `className` | `string` | — | — |

#### `TreemapChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number, tile: TreemapTile) => string` | — | Format the value. Defaults to a compact number. |
| `className` | `string` | — | — |

#### `TreemapChartLegendProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `limit` | `number` | — | How many tiles to name before stopping. The rest are left to the chart. |
| `showShare` | `boolean` | `false` | Show each tile's share beside its name. |

#### `TreemapChartHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | Small line above the value — what the total is of. |
| `value` | `string` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `string` | — | One muted line under the value — a period, a comparison, a caveat. |
| `children` | `ReactNode` | — | Trailing slot — a control, a badge, a range picker. |

### Example — A spending breakdown

Tiles are sorted largest first and laid out squarified, so the biggest part lands in one corner and the run reads outwards from it.

```tsx
<TreemapChart data={spend}>
  <TreemapChart.Header title="Spend this month" value="£48,200" />
  <TreemapChart.Tiles />
  <TreemapChart.Labels />
  <TreemapChart.Tooltip />
</TreemapChart>
```

### Notes

Tiles are sorted largest first because the layout needs them that way. The row test assumes a descending run — given a large tile beside a small one it has no good row to make, and the chart comes out as slivers. `sort={false}` is there for when the given order is itself the message, and the shapes will suffer for it.

Labels take their colour from the tile under them — white on a dark tile, near-black on a light one. Chart colours are set by the theme and can land anywhere on the scale, so a fixed white label would disappear on a pale one. A tile faded down the ramp is judged as it is drawn, blended with what is behind the chart, rather than by the colour it started as.

A tile smaller than `minLabelSize` on either side is left blank by `Labels`. A name clipped to two letters is not a shorter name but a different word, so those tiles are read through `Tooltip` instead — which is the reason to include it even on a chart whose large tiles are all labelled.

Negative values are treated as zero. There is no way to draw an area smaller than none, and scaling around it would misstate every other tile.

The layout runs when the data or the box changes, not per frame. `squarifyLayout` is exported for laying something else out on the same grid.

---

Full page, with every example: https://panelui.dev/docs/charts/treemap-chart
