# Pagination

Paged navigation over a long result set.

```tsx
import { Pagination } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Pagination } from '@/components/ui/pagination';
```

### Anatomy

```tsx
<Pagination>
  <Pagination.Status />
</Pagination>

{/* the parts the root draws for you, for a row of your own */}
<Pagination.Previous />
<Pagination.Item />
<Pagination.Ellipsis />
<Pagination.Summary />
<Pagination.Next />
```

### Variants

- **size** — `default` *(default)*, `sm`
- **current** — `true`, `false` *(default)*
- **disabled** — `true`

### Parts

- `Pagination.Item` — One numbered target. Announced as a selected button when it is the page you are on, so the current page is spoken as state rather than only painted.
- `Pagination.Previous` — Back one page. Dead on the first page rather than looping to the last.
- `Pagination.Next` — Forward one page. Dead on the last page rather than looping to the first.
- `Pagination.Ellipsis` — The gap in the run, and a way across it — tapping jumps `pageJump` pages towards the end the gap is on.
- `Pagination.Summary` — `3 / 12`, in the space the two arrows leave between them. What `variant="compact"` puts there.
- `Pagination.Status` — The line that says how much of the set you are looking at — `1–20 of 240`. Give it `pageSize` and `total`; it takes the page from the root.

### Props

#### `PaginationProps`

Extends `Omit<ViewProps, 'children'>, VariantProps<typeof paginationVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `count` | `number` | **required** | How many pages there are. Pages are numbered from 1, so this is also the last page's number. |
| `page` | `number` | — | The page being shown. Pass it to control the component. |
| `defaultPage` | `number` | `1` | The page to start on when the component keeps its own. Defaults to 1. |
| `onPageChange` | `(page: number) => void` | — | Called with the page that was asked for, already clamped to `count`. |
| `variant` | `PaginationVariant` | `numbers` | Which presentation to draw. |
| `size` | `PaginationSize` | `default` | — |
| `siblings` | `number` | `1` | How many pages to keep either side of the current one. Raise it on a tablet, where there is room for a longer run. |
| `boundaries` | `number` | `1` | How many pages to keep pinned at each end of the run. |
| `controls` | `boolean` | `true` | Show the previous and next arrows. Turning them off leaves the numbers alone, so only do it where something else moves the page — a swipe, a scroller reaching its end. |
| `pageJump` | `number` | `5` | How far tapping an ellipsis jumps. |
| `disabled` | `boolean` | `false` | Greys out and deafens the whole row — for a page that is still loading. |
| `accessibilityLabel` | `string` | `Pagination` | Labels the row for a screen reader. Defaults to "Pagination". |
| `children` | `ReactNode` | — | Leading content — a `Pagination.Status`, a page-size control of your own. |

#### `PaginationItemProps`

Extends `Omit<AnimatedPressableProps, 'children' \| 'disabled'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `page` | `number` | **required** | The page this target goes to. |
| `labelClassName` | `string` | — | Styles the number. |
| `children` | `ReactNode` | — | — |

#### `PaginationPreviousProps`

Extends `Omit<AnimatedPressableProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `label` | `boolean` | — | Write the word beside the arrow, rather than leaving it as a glyph. |

#### `PaginationNextProps`

Extends `Omit<AnimatedPressableProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `label` | `boolean` | — | Write the word beside the arrow, rather than leaving it as a glyph. |

#### `PaginationEllipsisProps`

Extends `Omit<AnimatedPressableProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `direction` | `-1 \| 1` | — | Which way the gap runs: `-1` towards page 1, `1` towards the last page. |
| `jump` | `number` | — | How many pages a tap covers. |

#### `PaginationSummaryProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `PaginationStatusProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `page` | `number` | — | Which page the span is counted from. Read from the root when left out. |
| `pageSize` | `number` | — | How many rows a page holds. Required for the span to be worked out. |
| `total` | `number` | — | How many rows there are altogether. |
| `children` | `ReactNode` | — | — |

### Example — Basic

`count` is how many pages there are; pages are numbered from 1. Pass `page` to control the component, or leave it off and give `defaultPage` to let it keep its own. `onPageChange` is called with the page that was asked for, already clamped to `count`.

```tsx
const [page, setPage] = useState(1);

<Pagination count={12} page={page} onPageChange={setPage} />
```

### Notes

Every target clears 44pt in both axes, which is the smallest a finger reliably hits. `size="sm"` draws a tighter row and keeps that reach through `hitSlop` instead — the paint gets smaller, the touch area does not.

### How wide a run can be

The run is a fixed number of targets, so `siblings` and `boundaries` decide the row's width and the container has no say in it. On a phone that ceiling is about nine targets at `size="sm"`, and the two arrows cost two more — past that the row is wider than the screen. It is clipped to its own bounds rather than allowed to spill, because a centred row that overflows hangs the same distance past both edges and the leading number ends up half off the screen with nothing to say why. If a run is being cut, lower `siblings` or `boundaries`, or drop the arrows with `controls={false}` and let the numbers have the width.

Which arrowhead means “back” is a question about the reading direction: under `<Direction dir="rtl">` the previous page is to the right, and the glyphs swap to match. Yoga mirrors the row itself; the arrowheads inside it have to be chosen.

`paginationRange` is exported for a control of your own that has to lay out the same run — a jump bar, a scrubber. Two implementations of that arithmetic would drift.

A page number past the end is clamped rather than honoured, so a `count` that shrinks under a controlled page — a filter narrowing the result set — lands on the last page instead of lighting nothing and disabling both arrows at once.

Number, arrow, and ellipsis controls compose a supplied `onPress` before their page transition. Arrow/ellipsis `disabled` props can add a local disabled state but cannot re-enable a control disabled by the root or a run boundary; component-owned names, state, hit areas, handlers, and classes remain authoritative after other forwarded props.

---

Full page, with every example: https://panelui.dev/docs/components/pagination
