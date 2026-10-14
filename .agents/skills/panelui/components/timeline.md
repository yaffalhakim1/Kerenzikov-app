# Timeline

A sequence of events, vertical or swiped sideways.

```tsx
import { Timeline } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Timeline } from '@/components/ui/timeline';
```

### Anatomy

```tsx
<Timeline>
  <Timeline.Item step={0}>
    <Timeline.Aside>
      <Timeline.Date>…</Timeline.Date>
      <Timeline.Label>…</Timeline.Label>
      <Timeline.Meta>…</Timeline.Meta>
    </Timeline.Aside>
    <Timeline.Indicator>…</Timeline.Indicator>
    <Timeline.Content>
      <Timeline.Header>
        <Timeline.Title>…</Timeline.Title>
        <Timeline.Trailing>…</Timeline.Trailing>
      </Timeline.Header>
      <Timeline.Stats>
        <Timeline.Stat label="…" value="…" />
      </Timeline.Stats>
      <Timeline.Description>…</Timeline.Description>
    </Timeline.Content>
  </Timeline.Item>
</Timeline>

<Timeline.Masthead media={…} label="…" title="…" />

<Timeline orientation="horizontal">
  <Timeline.Item step={0}>
    <Timeline.Aside>
      <Timeline.Meta>…</Timeline.Meta>
      <Timeline.Date>…</Timeline.Date>
    </Timeline.Aside>
    <Timeline.Indicator />
    <Timeline.Content>
      <Timeline.Description>…</Timeline.Description>
    </Timeline.Content>
  </Timeline.Item>
</Timeline>
```

### Variants

- **variant** — `dot` *(default)*, `icon`, `numbered`, `card`, `compact`
- **tone** — `default` *(default)*, `info`, `success`, `warning`, `danger`
- **completed** — `true`, `false` *(default)*
- **orientation** — `vertical` *(default)*, `horizontal`

### Parts

- `Timeline.List`
- `Timeline.Item` — One event. `step` is its position, `last` stops the connector.
- `Timeline.Aside` — Right-aligned meta column left of the rail. Place it before the indicator. Horizontal, it draws into the band the column already reserves above the rail and takes no height of its own — so it is optional, and a column without one still puts its tick on the line.
- `Timeline.Masthead` — The block above a horizontal rail, saying what the run of columns is: `media` (a logo pair, an avatar stack), then `label`, then `title`. It sits outside the `Timeline` because it belongs to the whole run rather than to any column, and a horizontal `Timeline` lays out nothing but columns. The two lines are typeset as one unit — the label a size below the title and muted, with tight leading — which a pair of `Text`s written at the call site is not.
- `Timeline.Indicator` — The node on the rail, with the connector below it. Horizontal, it is a tick on the shared rail and takes no children.
- `Timeline.Content` — Everything right of the rail — and everything below it when the timeline runs sideways, where it fades further than the column around it as that column leaves the reading edge.
- `Timeline.Header` — Title row: heading left, trailing slot right.
- `Timeline.Heading` — Wraps a title and anything stacked under it inside the header row.
- `Timeline.Date` — Timestamp, usually in the aside.
- `Timeline.Label` — Category line, coloured by the item's tone.
- `Timeline.Meta` — Muted supporting line — a person, a source.
- `Timeline.Title` — Event heading.
- `Timeline.Trailing` — Right-hand slot in the header row.
- `Timeline.Description` — Body text.
- `Timeline.Stats` — Bordered strip of label/value pairs.
- `Timeline.Stat` — One label/value pair inside `Stats`.

### Props

#### `TimelineProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `number` | `0` | Steps at or below this index render as completed. |
| `variant` | `TimelineVariant` | `dot` | — |
| `orientation` | `TimelineOrientation` | `vertical` | Which way the sequence runs. `horizontal` lays the items out as columns on a rail wider than the screen, swiped through rather than scrolled down. |
| `snap` | `boolean` | `true` | Horizontal only: land a flick on a column rather than between two. On by default, because the thing being moved between is a column — stopping halfway shows two half-columns and no whole one. |
| `haptics` | `boolean` | `false` | Horizontal only: a tick as the reading edge passes from one column to the next. Needs `snap`, since a scroll that lands anywhere has no detents to feel. Off by default — a haptic per column is a lot for a long history, and whether this one is worth feeling is the caller's call. |
| `onColumnChange` | `(index: number) => void` | — | Horizontal only: which column is at the reading edge, reported as it changes. For anything outside the rail that belongs to the column being read — a masthead naming it, a caption, a picture. Without it that block can only show the same thing for the whole run, which makes a swipe through ten columns a swipe under one unchanging heading. The index is the column's position among the rendered items, not its `step`: `step` is the progress value and may be sparse or repeated, so it cannot address a column. It fires on the crossing, not per frame — the reading edge passing from one column to the next — so it is a state update per column rather than per scroll event. |
| `children` | `ReactNode` | — | — |

#### `TimelineListProps`

Extends `<T> Omit< FlatListProps<T>, \| 'data' \| 'renderItem' \| 'horizontal' \| 'getItemLayout' \| 'onScroll' \| 'snapToOffsets' \| 'CellRendererComponent' >`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly T[]` | **required** | Complete event collection; rows outside the native window stay unmounted. |
| `renderItem` | `(info: ListRenderItemInfo<T>) => ReactElement<TimelineItemProps>` | **required** | Render one `Timeline.Item`. Its step, width, and last marker are owned by the list. |
| `itemWidth` | `number \| ((item: T, index: number) => number)` | — | Width of each column, or a resolver for mixed-width histories. |
| `value` | `number` | `0` | Steps at or below this index render as completed. |
| `variant` | `TimelineVariant` | `dot` | — |
| `snap` | `boolean` | `true` | — |

#### `TimelineItemProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `step` | `number` | **required** | Position in the sequence, zero-based. |
| `completed` | `boolean` | `false` | Force the completed state regardless of the timeline's value. |
| `tone` | `TimelineTone` | `default` | Colours the node and label — for event kind rather than progress. |
| `last` | `boolean` | `false` | Set on the final item so its rail stops at the indicator. |
| `width` | `number` | — | Horizontal only: how wide this column is, in points. Left out, a column that carries content takes a readable width and one that carries none collapses to a tick — so a quiet stretch of the sequence compresses instead of paying full width for nothing. Set it to override that for a column that needs more or less room than its contents suggest. It must be finite and greater than zero; invalid values use the content default. |
| `children` | `ReactNode` | — | — |

#### `TimelineIndicatorProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | Replaces the default node contents — an icon, say. |

#### `TimelineStatProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `label` | `string` | **required** | — |
| `value` | `string` | `0` | — |

#### `TimelineMastheadProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `media` | `ReactNode` | — | What sits above the two lines — a logo pair, an avatar stack, a single mark. Anything; the slot only lays it out in a row. |
| `label` | `string` | — | The small line: what kind of thing the run below is. |
| `title` | `string` | — | The name of it, in the size the eye lands on first. |
| `children` | `ReactNode` | — | Anything else, below the title. |

### Example — An activity feed

`value` is the index of the current entry; earlier ones render as completed.

```tsx
<Timeline value={2}>
  <Timeline.Item step={0}>
    <Timeline.Aside><Timeline.Indicator /></Timeline.Aside>
    <Timeline.Content>
      <Timeline.Header>
        <Timeline.Title>Order placed</Timeline.Title>
        <Timeline.Date>Mon 09:14</Timeline.Date>
      </Timeline.Header>
      <Timeline.Description>Payment authorised.</Timeline.Description>
    </Timeline.Content>
  </Timeline.Item>

  <Timeline.Item step={1}>
    {/* … */}
  </Timeline.Item>

  <Timeline.Item step={2} last>
    {/* `last` drops the connector below the final entry. */}
  </Timeline.Item>
</Timeline>
```

### Notes

In a horizontal timeline, snapping and focus follow the rendered `Timeline.Item` order. `step` remains the semantic progress value, so it may be sparse, repeated, or reordered without moving another column’s snap point; non-item children do not create phantom offsets.

Colour follows one rule: **progress is solid, event kind is tinted**. An untoned step runs from `muted` to `primary` as the timeline advances, exactly as `Steps` does; a toned step takes that tone's soft fill with its contents in the matching foreground. The `dot` and `card` variants keep full saturation — they are 16px discs with nothing inside, and a soft tint at that size disappears.

Icons inside `Timeline.Indicator` inherit a colour that reads against the node, so they stay legible in every theme without a hardcoded value.

### Horizontal

`Timeline.Masthead` goes above the rail — outside the `Timeline`, because a horizontal one lays out columns and the masthead belongs to the run rather than to any one of them. Media, then a small label, then the name.

Pair it with `onColumnChange` to make it follow the drag: the timeline reports which column the reading edge is on, and the masthead shows that column's. Without it a swipe through ten columns is a swipe under one unchanging heading.

The band above the rail is reserved by the column, so `Timeline.Aside` is optional — a column with nothing above the rail still puts its tick on the line.

The rail is drawn once across the whole track and every column puts a tick on it. What keeps those ticks on one line is that the band above the rail is a fixed height, reserved by the column itself — so `Timeline.Aside` draws into it rather than being what creates it, and a taller label cannot push one column's tick below its neighbours'.

A flick lands on a column rather than between two, which is what `snap` is for; turn it off for free scrolling.

A column drops four points and scales down four percent as it leaves the reading edge, and its date, age and description run from the muted token to the foreground one as it arrives — the same colour a heading uses. Position alone made the focused column nearer and no easier to read than its neighbours; colour is what says which one you are on.

The colour is driven by scroll position, not by a clock, so it is not disabled under reduced motion — the reader's own finger is what moves it. What that setting drops is the scale and the drop.

`haptics` adds a tick as the reading edge passes from one column to the next. It needs `snap`, since a scroll that lands anywhere has no detents to feel, and it is off by default: a haptic per column is a lot for a long history.

With the operating system set to reduce motion both curves are dropped and the rail simply scrolls.

`Timeline.Indicator` takes no children here: the node is a tick on the rail, not a disc with an icon in it, and `variant` does not change that.

Consumer `style` values compose around the horizontal item's measured width and scroll-driven fade rather than replacing them. A custom `width` must be finite and greater than zero; invalid values fall back to the same wide-or-narrow content default used when `width` is omitted.

For long horizontal histories, use `Timeline.List`. It uses React Native `FlatList` with a bounded native render window while the original compound `Timeline` API remains available for short or arbitrary mixed compositions. `renderItem` returns a `Timeline.Item`; the list owns its `step`, `width`, and `last` props so layout, progress, snapping, and item identity cannot disagree. `itemWidth` may be one number or a per-event resolver and must return a finite positive value.

---

Full page, with every example: https://panelui.dev/docs/components/timeline
