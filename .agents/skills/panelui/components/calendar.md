# Calendar

A month of days, for picking one, several, or a range.

```tsx
import { Calendar } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Calendar } from '@/components/ui/calendar';
```

### Usage

```tsx
const [day, setDay] = useState<Date>();

<Calendar selected={day} onSelect={setDay} />

// A span, which takes two taps to complete.
const [range, setRange] = useState<DateRange>();

<Calendar mode="range" selected={range} onSelect={setRange} />
```

### Variants

- **bordered** — `true` *(default)*

### Parts

- `Calendar.Header` — The row over a month: an arrow at each edge and the month's name, or the month and year pickers, between them. Rendered for you; exported for a header of your own.
- `Calendar.Nav` — One paging arrow. Borderless, 32px, with another 8 of slop around it.
- `Calendar.Grid` — One month: the weekday headings and six rows of days. Rendered for you per `numberOfMonths`; exported for a layout that needs the grid without the header.
- `Calendar.Day` — One cell — the number, the fill when it is selected, and its piece of the band when it is inside a range.

### Props

#### `CalendarProps`

Extends `<Mode CalendarMode = 'single'> extends Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `mode` | `Mode` | `'single' as Mode` | One day, several, or a span with two ends. |
| `selected` | `CalendarSelection[Mode]` | — | Controlled selection. Its shape follows `mode`. |
| `defaultSelected` | `CalendarSelection[Mode]` | — | Starting selection when uncontrolled. |
| `onSelect` | `(selected: CalendarSelection[Mode]) => void` | — | — |
| `month` | `Date` | — | Controlled visible month. Any day inside it will do. |
| `defaultMonth` | `Date` | — | Month shown first when uncontrolled. Defaults to the selection, or today. |
| `onMonthChange` | `(month: Date) => void` | — | — |
| `numberOfMonths` | `number` | `1` | Months side by side. Two is what picking a range across a boundary wants. |
| `captionLayout` | `CalendarCaptionLayout` | `label` | `dropdown` turns the caption into month and year pickers, which is the difference between choosing a birthday in four taps and in four hundred. |
| `disabled` | `CalendarDisabled` | — | Days that cannot be picked: a list, a span, or a rule. |
| `minDate` | `Date` | — | Earliest selectable day. Also stops the caption paging back past it. |
| `maxDate` | `Date` | — | Latest selectable day. |
| `startMonth` | `Date` | — | Earliest month the caption's pickers offer. Defaults to `minDate`, and to a hundred years back when there is none. Separate from `minDate` because they answer different questions: `minDate` is about which days can be picked, this is about how far the month and year lists reach. A birthday picker wants a century of years on offer and no bound at all on the days inside them. |
| `endMonth` | `Date` | — | Latest month the caption's pickers offer. Defaults to `maxDate`, else ten years on. |
| `weekStartsOn` | `number \| 'auto'` | `0` | Which day the week's first column is. `0` is Sunday. `auto` asks the locale, which is what most of the world wants — `en-GB` and `fr-FR` start on Monday, and a calendar that says otherwise is wrong in a way its reader notices immediately. It is not the default only because changing an existing calendar's columns out from under it is not something a version bump should do. Out-of-range numbers wrap rather than producing a blank column. |
| `showOutsideDays` | `boolean` | `true` | Draw the neighbouring months' days rather than leaving the cells blank. |
| `selectOutsideDays` | `boolean` | `false` | Let a tap on a neighbouring month's day select it. Off by default: those cells exist to keep the grid six rows tall, and a tap on one is far more often a misfire than an attempt to reach into July from June. Paging to the month is the way to pick a day in it. |
| `bordered` | `boolean` | `true` | Draw the calendar's own panel — a rounded, bordered card. On by default, for a calendar standing on a page. Turn it off when it is already inside something that draws one, which is what `DatePicker` does. |
| `locale` | `DateLocale` | — | BCP 47 tag for the month and weekday names. The device's own by default. |
| `calendar` | `CalendarSystem` | `gregory` | Which calendar the months and the day numbers are counted in. `gregory` by default rather than `auto`: a grid whose month boundaries move with the device's language is a surprise, and it is the caller — not the locale — who knows whether the dates being picked are Hijri ones. `auto` follows the locale for the cases where they are the same question. |

#### `CalendarHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `offset` | `number` | — | Which month of the run this header sits over. `0` is the first. |
| `lastOffset` | `number` | — | The last offset in the run, so the header knows whether it owns the arrow. |

#### `CalendarNavProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `direction` | `'previous' \| 'next'` | **required** | — |
| `disabled` | `boolean` | — | — |
| `onPress` | `() => void` | — | — |

### Example — A single day

Tapping the selected day again clears it, so there is a way back to nothing without a separate control.

```tsx
const [day, setDay] = useState<Date>();

<Calendar selected={day} onSelect={setDay} />
```

### Notes

**The grid is always six weeks.** A month needs five rows or six depending on the day it starts on, and drawing only the rows it uses makes the calendar change height as it is paged — everything below jumps, and the days themselves appear to shift between months. The spare cells hold the neighbouring months' days, or are left blank with `showOutsideDays={false}`. Blank, not absent: the row has to stay seven wide or the columns stop lining up with their headings.

**A range is drawn cell by cell.** On the web the band under a range is one background with its ends rounded by `:first-child` and `:last-child`. There are no pseudo-classes here, so each cell draws its own piece behind the number — behind, rather than as the cell's own background, which is what lets the pieces meet.

Each cell answers two questions, and they are not the same one. *How wide*: a day between the ends fills its cell, and an end fills half of one, from the centre outwards towards the rest of the range — the half the fill does not cover, so the two read as one shape instead of a disc sitting next to a stripe. *Where it is rounded*: only where the band genuinely stops, which is at an end of the range or at the edge of a row, because a range running over a weekend has to close off on Saturday and open again on Sunday rather than trailing into the gap between the rows.

Days are square-ish rather than round for the same reason. A circle touches the band beside it at one point, so a range reads as beads on a string; a rounded rectangle meets it along a whole edge.

**Days are compared at local midnight.** A `Date` carries a time, and two values on the same day are not equal until it is stripped.

**It opens on the selection, not on today.** A picker reopened on a date chosen last year lands on that month — otherwise it opens on today and the choice looks lost.

**`minDate` and `maxDate` bound the paging too**, not only the selection: an arrow that pages to a month where every day is dead is an arrow that should have been off. So do the caption's month and year lists, and so does a controlled `month` — every route to a new month goes through the same clamp, because a list that offers a year is a poor place to discover the year was out of bounds. Both are compared at local midnight, so `minDate={new Date()}` means *from today* and does not rule today out.

**`startMonth` and `endMonth` are a different bound.** They say how far the caption's month and year lists reach, not which days can be picked. A birthday picker wants a century on offer and no bound at all on the days inside it, which is one prop pair for each half of that sentence.

**`calendar` goes all the way down.** It is `gregory` by default rather than `auto`, because a grid whose month boundaries move with the device's language is a surprise — and it is the caller, not the locale, who knows whether the dates being picked are Hijri ones. Set `islamic` and the month anchoring, the paging, the outside-day dimming and the day numbers all count in it, so the caption and the cells can never disagree. Month lengths are asked of the platform's own calendar data a day at a time rather than read from a table, which is what keeps a 29-day month 29 days in the years it is one.

**`weekStartsOn` can follow the locale.** It is `0` — Sunday — by default, which is right for North America and wrong for most of everywhere else. `weekStartsOn="auto"` asks the locale instead, so `en-GB` and `fr-FR` open on Monday. It is not the default only because changing an existing calendar's columns out from under it is not something a version bump should do. Numbers outside `0`–`6` wrap rather than producing a blank column.

**Digits are pinned to Latin.** The cells render numbers, so a caption in Arabic-Indic over cells in Latin would be two scripts for one date; both are Latin instead.

**Without islamic data in the build, it falls back to Gregorian** rather than throwing — wrong, but coherent, which is the same posture the month names already take.

## Working with dates

JavaScript `Date` arithmetic is wrong in ways that do not show up until someone is in another timezone in another month, so this is what the calendar does and why. Every one of these is worth copying into your own code.

**Step days with calendar fields, never with milliseconds.** `setDate(getDate() + n)` is right across a daylight-saving boundary; `+ n * 86400000` is an hour out on the two days a year the clocks move, which is enough to land the wrong side of midnight and shift the whole grid by a day.

**Normalise to the 1st before adding months.** `setMonth` on the 31st of a month whose neighbour is shorter overflows into the month *after* next — January 31st plus one month is March 3rd. Rebuilding the date on the 1st first makes the arithmetic mean what it reads as.

**Ask for the last day of a month by asking for day 0 of the next one.** `new Date(y, m + 1, 0)` is the last day of month `m`, so a leap February needs no special case and no rule about which years have one.

**Normalise both sides of every comparison.** A bound that carries a time of day silently excludes its own last day: `date <= endOfRange` is false all afternoon if `endOfRange` was captured at nine in the morning. Both operands go through `startOfDay` here, always.

**Compare days by calendar fields, not by timestamp.** Two `Date`s are the same day when their year, month and date agree — not when some derived number does.

**Stay in local time.** No `toISOString`, no UTC round-trips. A date shown to a reader is a local calendar day, and a UTC round-trip moves it by one for half the planet.

**Never build a date out of formatted text.** Ask `Intl` for the *parts* and read the numbers from those; the order and the separators belong to the locale and only the numbers are yours. And cache the formatter — constructing one is the expensive half of formatting.

**Do not assume a calendar labels a day 1.** The observational Islamic calendars the platforms ship do not always emit one: in 1450 AH, month 11 day 30 is followed directly by month 12 day 2. Find a month boundary by watching for the month *number* to change, not by hunting for a particular day number.

**"Today" is not a constant.** A calendar left open across midnight keeps marking yesterday. This one recomputes when the app comes back to the foreground, which is when a stale answer would otherwise become visible.

---

Full page, with every example: https://panelui.dev/docs/components/calendar
