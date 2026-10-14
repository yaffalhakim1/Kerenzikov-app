# Kpi

One number, what it is doing, and the shape it made getting there.

```tsx
import { Kpi } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Kpi } from '@/components/ui/kpi';
```

### Anatomy

```tsx
<Kpi colorIndex={1} goodDirection="up">
  <Kpi.Header>
    <Kpi.Icon>{/* a glyph */}</Kpi.Icon>
    <Kpi.Title />
    <Kpi.Actions>{/* a menu */}</Kpi.Actions>
  </Kpi.Header>
  <Kpi.Content layout="inline">
    <Kpi.Stat>          {/* title, value and change, stacked */}
      <Kpi.Title />
      <Kpi.Value />
      <Kpi.Trend value={7.8} />
    </Kpi.Stat>
    <Kpi.Chart data={series} dataKey="v" inline />
  </Kpi.Content>
  <Kpi.Progress value={73} />
  <Kpi.Separator />
  <Kpi.Footer>{/* a caveat */}</Kpi.Footer>
</Kpi>

<Kpi.Group orientation="horizontal">{/* several cards */}</Kpi.Group>
```

### Variants

- **tone** — `good`, `bad`, `flat`, `neutral` *(default)*
- **trendVariant** — `text` *(default)*, `badge`
- **layout** — `below` *(default)*, `inline`

### Parts

- `Kpi.Header` — The top row: a tinted icon, the metric's name, and anything acting on it.
- `Kpi.Icon` — A tinted square for a glyph. It takes the element rather than drawing one — a metric's icon comes from whatever set the app already uses, and an icon from outside this library needs its `color` passed explicitly.
- `Kpi.Title` — The metric's name. Quiet on purpose: the value is the thing being read.
- `Kpi.Stat` — The stacked title / value / change block. Its own container rather than three loose children, because the three belong together more tightly than they belong to whatever is above or below them — and because it takes the width in an `inline` row, leaving the chart its column on the end.
- `Kpi.Actions` — The trailing end of the header — a menu trigger, a period filter, a link.
- `Kpi.Content` — The row the value and the trend share. `layout="inline"` puts the chart beside them instead of under everything.
- `Kpi.Value` — The number. Formatted by you, not here — separators, currency and units are locale decisions a component would get wrong in a way that is hard to notice and impossible to override.
- `Kpi.Trend` — The change. Takes a signed percentage and derives its own direction and colour. `text` by default — a line of colour under the number — or `variant="badge"` for a pill with an arrow.
- `Kpi.Chart` — The sparkline. A line chart with the axis padding dropped. Under the card it is full width and filled; `inline` puts it in a fixed 128pt column beside the number, unfilled.
- `Kpi.Progress` — Progress towards a target, for a metric that has one.
- `Kpi.Footer` — The bottom strip — a comparison period, a caveat, a link.
- `Kpi.Separator` — A hairline across the card.
- `Kpi.Group` — Several metrics laid out as one panel, in a row or a column, divided by a rule.

### Props

#### `KpiProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `colorIndex` | `SeriesColorIndex` | — | Which `--color-chart-*` token the sparkline and the icon take. Set on the card rather than on the chart so a row of cards can be given five different series colours without repeating the choice on every part. |
| `goodDirection` | `KpiGoodDirection` | — | Which way is the good news. `up` for revenue and signups, `down` for churn and latency, `none` for a number that is neither — a headcount, a version. Defaults to `up`. |
| `surface` | `boolean` | — | Draw the card on a surface. Turn off to place it in a shell of your own. |
| `children` | `ReactNode` | **required** | — |

#### `KpiHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | **required** | — |

#### `KpiIconProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `tone` | `KpiTone` | `neutral` | Overrides the tint the card's `colorIndex` would give it. |
| `children` | `ReactNode` | **required** | — |

#### `KpiTitleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | **required** | — |

#### `KpiStatProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | **required** | — |

#### `KpiActionsProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | **required** | — |

#### `KpiContentProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `layout` | `NonNullable<KpiVariantProps['layout']>` | `below` | `inline` puts the chart beside the value instead of under everything. |
| `children` | `ReactNode` | **required** | — |

#### `KpiValueProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | **required** | — |

#### `KpiTrendProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `number` | **required** | How much it moved, as a percentage. The sign carries the direction, so `-4.2` is a fall of 4.2%; there is no separate direction prop to keep in step with it. |
| `format` | `(value: number) => string` | — | Writes the number yourself. Receives the raw value, sign and all. The default prints one decimal place with an explicit `+` or `−`. |
| `goodDirection` | `KpiGoodDirection` | — | Overrides the card's own `goodDirection` for this one figure. |
| `variant` | `NonNullable<KpiVariantProps['trendVariant']>` | `text` | `text` is a line of colour under the number — the default, and what a stat card usually wants. `badge` puts a pill round it, with an arrow, for a card busy enough that a bare line of colour is lost in it. |
| `caption` | `string` | — | What it is being compared against — "last 30d", "vs last week". |
| `children` | `ReactNode` | — | Anything after the number, when a caption is not enough. |
| `threshold` | `number` | `0` | Below which a movement counts as no movement. Defaults to `0`. |

#### `KpiSparklineProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `data` | `LineChartDatum[]` | **required** | The rows. One point each, in order. |
| `dataKey` | `string` | **required** | Key holding the y values. |
| `colorIndex` | `SeriesColorIndex` | — | Overrides the card's `colorIndex`. |
| `filled` | `boolean` | — | Fill under the line. Off beside the number, where the chart is a gesture and a fill would make it a second block competing with the value; on when it has the full width under everything and is being looked at properly. |
| `height` | `number` | — | Height in points. |
| `inline` | `boolean` | `false` | Put it beside the number, taking whatever width the text leaves rather than a column of its own. Pair with `layout="inline"` on the content row. |
| `strokeWidth` | `number` | `2` | — |

#### `KpiProgressProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `number` | **required** | Where it has got to. |
| `maxValue` | `number` | `100` | The value at which the bar reads as full. Defaults to `100`. |
| `label` | `string` | — | A caption above the bar. |
| `showValueLabel` | `boolean` | — | Print the percentage on the right of the caption row. |

#### `KpiFooterProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | **required** | — |

#### `KpiSeparatorProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `KpiGroupProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `orientation` | `KpiGroupOrientation` | — | `horizontal` splits the row between the cards; `vertical` stacks them. |
| `separated` | `boolean` | — | Draw a hairline between the cards rather than spacing them apart. Several metrics separated by a rule read as one panel; several spaced apart read as several panels that happen to be adjacent. |
| `children` | `ReactNode` | **required** | — |

### Example — Which way is the good news

Colour comes from what the movement *means*, not from its sign. A fall in churn, refunds or latency is good news and is drawn as good news — say so once on the card with `goodDirection` and every trend inside it follows. `"none"` is for a number that is neither, like a headcount.

```tsx
{/* A rise is good — the default. */}
<Kpi goodDirection="up">
  <Kpi.Trend value={7.8} />   {/* green */}
</Kpi>

{/* A fall is good. */}
<Kpi goodDirection="down">
  <Kpi.Trend value={-8.4} />  {/* also green */}
</Kpi>

{/* Neither. */}
<Kpi goodDirection="none">
  <Kpi.Trend value={2.2} />   {/* grey */}
</Kpi>
```

### Notes

The sparkline is a `LineChart` in `compact` mode — the same chart used everywhere else with its axis padding dropped, because there is no grid, no axis and no crosshair here and every point of padding is one the shape is not using.

`inline` gives it a **fixed 128pt column** rather than a share of the row. A stack of stat cards has labels of every length — "Revenue" over "New customers" — and a chart taking whatever the text leaves would be a different width on every card in it. Fixed, the shapes line up down the right-hand edge, which is the only reason they are there to be compared.

### Where the space goes

`Kpi.Stat` exists because a title, a number and a change are one fact in three lines, and the card’s own spacing is for the gaps *between* facts. Writing the three straight into the card gives them the wider spacing and they stop reading as a unit.

It also matters for a row of them. `Kpi.Title` grows to fill a header row, and a growing child of a *column* absorbs that column’s leftover height — which would push each card’s number down by however much that card had spare, and land three numbers at three different heights. The title only grows inside `Kpi.Header`.

### Colour

`colorIndex` is set on the card rather than on the chart, so a row of cards can be given five different series colours without repeating the choice on every part inside them. It resolves through the `--color-chart-*` tokens, so the cards follow the theme.

The trend does not use it. A change is coloured by meaning — success or destructive — and a metric’s series colour has nothing to say about whether its number went the right way.

### Accessibility

A trend is announced as one string — *"Up 7.8 percent, last 30d"* — rather than as an arrow, a number and a caption a screen reader would read as three unrelated stops. The rules inside a `Group` are hidden from it: a divider between two metrics is decoration, and announcing it puts an unlabelled stop between them.

---

Full page, with every example: https://panelui.dev/docs/components/kpi
