# RingChart

Concentric arcs, each measured against its own target.

```tsx
import { RingChart } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { RingChart } from '@/components/ui/ring-chart';
```

### Anatomy

```tsx
<RingChart data={…}>
  <RingChart.Header />                 {/* the strip above the rings */}
  <RingChart.Ring index={0} />         {/* one per entry, outermost first */}
  <RingChart.Ring index={1} />
  <RingChart.Center />                 {/* the readout in the hole */}
  <RingChart.Legend />
</RingChart>
```

### Parts

- `RingChart.Header` — The strip above the rings — what the chart is of, what it reads, and a key for the colours. The chart introducing itself, as distinct from the caption on the card around it.
- `RingChart.Ring` — One ring: a track, and the arc showing how far along it the value has got. Segment it into ticks with `segments`.
- `RingChart.Center` — The readout in the hole. Shows the outermost ring until one is selected, then that ring’s own figures.
- `RingChart.Legend` — A swatch, a name and a percentage per ring — pressable in the same way the rings are, and usually the easier target of the two. Prefer `Header legend` on a chart that has a header.

### Props

#### `RingChartProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `data` | `RingDatum[]` | **required** | One entry per ring, outermost first. |
| `size` | `number` | — | Fixed diameter in points. Measured from the container when omitted. |
| `strokeWidth` | `number` | `12` | Thickness of each ring. |
| `ringGap` | `number` | `6` | Gap between one ring and the next. |
| `startAngle` | `number` | `0` | Where the arcs begin, in degrees clockwise from twelve o'clock. `0` is the top, `90` the right-hand side. |
| `endAngle` | `number` | `360` | Where they end, on the same clock. Leaving a turn's worth between the two gives a closed ring; anything less leaves a gap and reads as a gauge — `startAngle={-90} endAngle={90}` is the half circle over the top. |
| `animationDuration` | `number` | `700` | Milliseconds for the arcs to sweep in. |
| `activeIndex` | `number` | — | Selected ring. Leave unset to let the chart track it. |
| `onActiveIndexChange` | `(index: number) => void` | — | Fires with the selected ring, or `-1` when the selection is cleared. |
| `children` | `ReactNode` | — | — |

#### `RingChartRingProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `index` | `number` | **required** | Which entry in `data` this ring draws. |
| `color` | `string` | — | Explicit colour, overriding the datum's and the token. |
| `colorIndex` | `SeriesColorIndex` | — | Which of the five chart tokens to take, when the datum names no colour. |
| `lineCap` | `'round' \| 'butt'` | — | Rounded ends, or square ones. Defaults to round, and to square when the ring is segmented — a rounded cap on a tick as long as it is wide draws a lozenge rather than a tick. |
| `trackOpacity` | `number` | `0.15` | Opacity of the track behind the arc. |
| `segments` | `number` | — | Break the ring into this many ticks, lit one at a time as the value climbs. For a target made of countable things — eight of twelve sessions reads off ticks you can count, and off a smooth arc only as "about two thirds". |
| `segmentGap` | `number` | `3` | Gap between one tick and the next, in points. |

#### `RingChartCenterProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultLabel` | `string` | — | Heading shown when no ring is selected. Defaults to the outermost ring's own name, which is what the centre shows when nothing has been picked. |
| `formatValue` | `(value: number, ring: RingDatum \| null) => string` | — | Format the number under the label. Defaults to a compact number. |
| `children` | `(ring: RingDatum \| null) => ReactNode` | — | Draw the middle yourself. Given the selected ring, or `null` when nothing is selected. |
| `className` | `string` | — | — |

#### `RingChartLegendProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `showValue` | `boolean` | — | Show each ring's percentage of its own target beside its name. |

#### `RingChartHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | Small line above the value — what the chart is of. |
| `value` | `string` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `string` | — | One muted line under the value — a period, a comparison, a target. |
| `labels` | `Record<string, string>` | — | Prettier names for the rings, keyed by their `label`. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per ring along the trailing edge. Prefer this to `RingChart.Legend` on a chart that has a header: that legend hangs off the bottom of the square, where it overlaps whatever is under the chart. |
| `children` | `ReactNode` | — | Trailing slot — a control, a badge, a range picker. Wins over `legend`. |

### Example — The data

Each ring carries its own target. `maxValue` is what makes an arc mean something: without it the arc shows how far something went, and with it, how far it went *of what it was aiming at*.

```tsx
const goals: RingDatum[] = [
  { label: 'Move', value: 486, maxValue: 600 },
  { label: 'Exercise', value: 24, maxValue: 30 },
  { label: 'Stand', value: 9, maxValue: 12 },
];
```

### Notes

### Why every ring has a track

An arc drawn on nothing shows how far something went. An arc drawn on a full circle shows how far it went *of what it was aiming at*, which is the entire question a ring chart is asked. The track is the target made visible.

A value past its target fills the ring and stops there. Going round twice would draw 110% as 10%, which is the wrong answer told confidently.

### What the centre shows

The outermost ring, until one is selected. Not a total: the rings measure different things against different targets, so their values do not add up and their percentages do not average — a total in the middle would be a confident number about nothing. Pass a render function to `Center` when your rings *do* share a unit and a total is honest.

### The header, and the card around it

`RingChart.Header` belongs to the chart; the card's header belongs to the tray the chart sits in. The distinction is worth keeping: the header's value changes as a ring is selected, and its legend is the list the chart itself is holding. Pass the formatted value in rather than expecting it to be derived — there is no total to derive from targets that measure different things.

### Touch, not hover

Rings are selected by pressing them. There is no equivalent here of a pointer resting somewhere without committing, so a chart that only revealed its numbers on hover would never reveal them at all — and because a twelve-point band is below the size a finger reliably hits, the touch target is widened well past the ring it belongs to.

### Reduced motion

The sweep is skipped and the arcs draw at their final length.

---

Full page, with every example: https://panelui.dev/docs/charts/ring-chart
