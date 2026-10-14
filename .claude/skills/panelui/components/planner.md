# Planner

A month of days, each carrying what falls on it.

```tsx
import { Planner } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Planner } from '@/components/ui/planner';
```

### Anatomy

```tsx
<Planner entries={entries} categories={categories}>
  <Planner.Header>
    <Planner.Title />
    <Planner.Today />
    <Planner.Nav />
    <Planner.Action>{/* a button of yours */}</Planner.Action>
  </Planner.Header>
  <Planner.Grid />           {/* or <Planner.Scroller /> */}
  <Planner.Legend>
    <Planner.Summary />
  </Planner.Legend>
  <Planner.Footer>{/* tools that act on the month */}</Planner.Footer>
  <Planner.Details>{(date, entries) => /* … */}</Planner.Details>
</Planner>
```

### Variants

- **inMonth** — `true` *(default)*, `false`
- **variant** — `default` *(default)*, `tiles`, `calendar`

### Parts

- `Planner.Header` — The strip along the top of the frame. Anything you put in it sits there rather than in the panel.
- `Planner.Title` — The month on show, in the calendar system and locale the grid is using. Pass children to say something else.
- `Planner.Today` — Jumps back to the month today is in. Disabled while you are already there.
- `Planner.Nav` — Back and forward a month.
- `Planner.Action` — The trailing end of the header strip, for a button of yours.
- `Planner.Grid` — The weekday row and the six weeks under it. `renderDay` replaces the cell.
- `Planner.Scroller` — The weeks of the year in one scroll, running past the end of a month instead of stopping at it. Use it instead of `Grid`, not beside it.
- `Planner.Day` — One cell. The grid renders these; you only reach for it directly inside `renderDay`.
- `Planner.Legend` — The key to the marker colours. `counts` prints each category's total for the month.
- `Planner.Summary` — What the month adds up to. Counts the month only, never the days either side of it.
- `Planner.Footer` — The strip along the bottom, for tools that act on the month.
- `Planner.Details` — A dialog bound to the open day, its children a function of that day and what falls on it.

### Props

#### `PlannerProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `month` | `Date` | — | The month on show. Leave it out for an uncontrolled planner. |
| `defaultMonth` | `Date` | — | — |
| `onMonthChange` | `(month: Date) => void` | — | — |
| `entries` | `PlannerEntry[]` | `[]` | Everything the planner knows about, in any order and any month. |
| `categories` | `PlannerCategory[]` | `[]` | The colour key. Declaration order is legend order and palette order. |
| `selected` | `Date \| null` | — | The open day. `null` is none. Leave it out for an uncontrolled planner. |
| `defaultSelected` | `Date \| null` | `null` | — |
| `onSelectedChange` | `(date: Date \| null) => void` | — | — |
| `onDayPress` | `(date: Date, entries: PlannerEntry[]) => void` | — | Runs before the selection moves, whether or not `Details` is present. |
| `variant` | `PlannerVariant` | `default` | What each day draws. `tiles` is one large icon per day, tinted by its category; `calendar` names every entry and needs the height to do it. |
| `fill` | `boolean` | `false` | Stretch the grid to its container instead of standing at its own height. For a planner that owns a screen — the six weeks share out whatever is left after the header, the legend and anything below them. |
| `entryLimit` | `number` | — | How many entries a cell draws before it counts the rest. Default `2`, or `3` under `calendar`, which has the room; `tiles` draws one whatever you pass. |
| `weekStartsOn` | `number \| 'auto'` | `auto` | First day of the week, 0 is Sunday. Defaults to the locale's. |
| `locale` | `DateLocale` | — | — |
| `calendar` | `CalendarSystem` | `gregory` | — |
| `frame` | `boolean` | `true` | Draw the surrounding `Frame`. Off for a planner in a sheet or a card. |
| `children` | `ReactNode` | — | — |

#### `PlannerHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |

#### `PlannerTitleProps`

Extends `Omit<TextProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | Replaces the month name, for a title that says something else. |

#### `PlannerTodayProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | Replaces the word on the pill. |

#### `PlannerNavProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `PlannerActionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |

#### `PlannerGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `renderDay` | `PlannerDayRenderer` | — | Draws a cell yourself. It is handed the day and what falls on it. |

#### `PlannerDayProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `date` | `Date` | **required** | — |
| `renderDay` | `PlannerDayRenderer` | — | — |

#### `PlannerLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `counts` | `boolean` | — | Print each category's count for the month beside its label. |
| `children` | `ReactNode` | — | Sits at the trailing end — a total, a currency, whatever the month adds to. |

#### `PlannerSummaryProps`

Extends `Omit<TextProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | Replaces the count, for a total that is money rather than entries. |

#### `PlannerFooterProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PlannerDetailsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `ReactNode` | — | Title above the children. Defaults to the day's full date. |
| `description` | `ReactNode` | — | The line under the title. Defaults to how many entries the day carries, so the dialog answers "how much of this is there" before it is read. Pass `null` to drop it. |
| `children` | `(date: Date, entries: PlannerEntry[]) => ReactNode` | **required** | Given the open day and what falls on it. |

#### `PlannerScrollerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `weeks` | `number` | `53` | How many weeks either side of the opening month can be reached. Default `53`, about a year each way. |
| `rowHeight` | `number` | `96` | The height of one week row. Default `96`. |
| `renderDay` | `PlannerDayRenderer` | — | Draws a cell yourself. It is handed the day and what falls on it. |

### Example — A month of renewals

The ordinary case. Entries in any order, two categories, and the legend that reads them.

```tsx
const [month, setMonth] = useState(new Date(2026, 0));

<Planner
  month={month}
  onMonthChange={setMonth}
  entries={[
    { id: 'n', date: new Date(2026, 0, 2), label: 'Netflix', category: 'monthly' },
    { id: 'a', date: new Date(2026, 0, 7), label: 'Adobe', category: 'monthly' },
    { id: 'f', date: new Date(2026, 0, 10), label: 'Figma', category: 'yearly' },
  ]}
  categories={[
    { id: 'monthly', label: 'Monthly' },
    { id: 'yearly', label: 'Yearly' },
  ]}
>
  <Planner.Header>
    <Planner.Title />
    <Planner.Today />
    <Planner.Nav />
  </Planner.Header>
  <Planner.Grid />
  <Planner.Legend counts>
    <Planner.Summary />
  </Planner.Legend>
</Planner>
```

### Notes

### Entries and categories

An entry is `{ id, date, label }`, plus an optional `category` and `icon`. Pass the whole set at once, in any order and across any months; the planner indexes the set once by day, then month changes inspect only the fixed 42-cell grid. Cell entry nodes remain bounded by `42 × entryLimit`, while counts and spoken labels still include every entry.

A `category` is the key to a colour. Categories take their dot from the `--color-chart-*` tokens in the order they are declared, so they follow the theme into dark mode — give one a `colorIndex` to pick a different token, or a `color` for a brand that is not the theme's to choose.

### Today, and the day you opened

Today rings its tile; the day you open fills it. They are two different marks because they answer two different questions — which day it is now, and which day the details below belong to — and a day that is both keeps the ring over the fill. Planner refreshes that ring at local midnight while it stays open, and refreshes again when the app returns from the background.

The ring is drawn in the foreground colour, so it reads as a plain outline against the tile in either theme. Every cell reserves the ring's width whether it draws one or not, so nothing shifts by a point at the moment it is picked.

### What a day draws, and what it says

A cell draws up to `entryLimit` icons — two by default — and then a count of what is left. It is one marker dot per day rather than one per entry: a cell that fits a row of dots does not also fit the date.

The marker carries its meaning in colour, and colour is a signal that does not reach every reader. So the legend prints its label beside every swatch, and a day is spoken as its date, how many entries it carries and which categories they belong to — "16 January 2026, 3 entries: Monthly, Yearly". Between them those two are the whole content of the grid for somebody who cannot see it.

The weekday headings are hidden from screen readers. Each day already names its own weekday, and React Native has no per-cell grid vocabulary to fall back on — no `gridcell`, no `row` — so a day has to be self-contained, and reading the heading again over 42 cells only makes it longer.

On the web, one day is in the Tab order. Arrow Left/Right moves one visible day, Arrow Up/Down one week, and Home/End reaches the first or last day in the rendered week; movement stops at the six-week grid boundary. Enter and Space use the day button's ordinary press action. Native and TV keep every day as an ordinary Pressable so the platform focus engine owns directional movement. A custom `renderDay` also owns its own focus and activation behavior.

Using the month navigation announces the new month after it is shown. Mounting the planner and changing a controlled `month` prop directly stay silent, so an ordinary parent render does not interrupt what somebody is already reading. A controlled navigation request is announced only if the parent accepts it on the next committed render.

### What a cell draws

`variant` decides it, and a cell can only give one answer:

- **`default`** — the date, a marker dot, and up to `entryLimit` icons under it.
- **`tiles`** — the day given over to one large icon, the tile tinted with its colour, and the date small in the corner.
- **`calendar`** — every entry named in a block of its colour, under a centred date, on an open grid ruled off by week.

An entry can carry its own `color`. It wins over its category's, and it is what a brand wants: a logo belongs to the thing rather than to the group it was filed under, and a set of them would otherwise need one category per row.

`tiles` leaves the days either side of the month blank. There is no tile, nothing to press and nothing read out, because a faded tile only invites the press it is going to ignore. Only the weeks the month actually spans are drawn, and they share out the height six weeks would have taken — so a five-week month has slightly taller tiles than a six-week one, and neither leaves a band of empty space or changes the size of the panel.

`calendar` needs height for its labels. Give it `fill` inside a `flex-1` parent, or use `Scroller`, which sets its own row height.

An entry with no colour of any kind is drawn plain rather than tinted. The colour says what kind of thing is on the day; a day with no answer to that is better left alone than coloured for the sake of it.

### Paging, and scrolling

`Grid` is a month at a time: six weeks, moved through with `Nav`, which is what a planner sharing a screen with something else wants.

`Scroller` is the weeks of the year in one list. Use it when the question is what is coming rather than what this month looks like — the week straddling a month boundary is then drawn once, in one piece, instead of appearing cut in half at the bottom of one page and again at the top of the next.

The range is bounded, at `weeks` either side of the month it opened on — about a year each way by default. A scroller has to know its own height to place a scrollbar and to reach a month without rendering its way there, and neither is possible over a list with no end.

The header follows the scroll. Whichever month holds most of the first week on screen is the one named, and the days either side of it grey out. `Nav` and `Today` still work; they scroll the list rather than replacing what is in it. A scroll never announces the month it arrives at — that would talk over somebody reading the weeks — while `Nav` and `Today` still do, because those are deliberate.

`entryLimit` caps what a cell draws. It defaults to `2`, or `3` under `calendar`, which has the room; `tiles` draws one whatever you pass. Past the limit `calendar` prints an ellipsis rather than a count: the cell has already run out of room, and a row spent on "+2 more" is a row not spent on an entry.

### Filling a screen

`fill` stretches the weeks to their container instead of standing them at their own height. It needs a height to fill — inside a scroll view there is none, and the grid collapses — so put a `fill` planner in a `flex-1` parent.

### The frame

The root draws its own `Frame`: a month at a glance wants a boundary, a strip carrying the month and the way through it, and a footer that holds still while the middle changes. Pass `frame={false}` for a planner inside a sheet or a card that already draws its own edge.

---

Full page, with every example: https://panelui.dev/docs/components/planner
