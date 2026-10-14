# DatePicker

A calendar behind a button.

```tsx
import { DatePicker } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { DatePicker } from '@/components/ui/date-picker';
```

### Usage

```tsx
const [day, setDay] = useState<Date>();

<DatePicker selected={day} onSelect={setDay} placeholder="Pick a date" />
```

### Parts

- `DatePicker.Trigger` — Wraps a trigger of your own and opens the panel on press. Pass a child to the picker instead and it is wrapped for you.

### Props

#### `DatePickerProps`

Extends `<Mode DatePickerMode = 'single'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `mode` | `Mode` | `'single' as Mode` | One day, several, or a span with two ends. |
| `selected` | `CalendarSelection[Mode]` | — | Controlled selection. Its shape follows `mode`. |
| `defaultSelected` | `CalendarSelection[Mode]` | — | Starting selection when uncontrolled. |
| `onSelect` | `(selected: CalendarSelection[Mode]) => void` | — | — |
| `open` | `boolean` | — | Controlled open state of the panel. |
| `onOpenChange` | `(open: boolean) => void` | — | — |
| `placeholder` | `string` | `Pick a date` | What the trigger reads when nothing has been chosen. |
| `format` | `(selected: CalendarSelection[Mode]) => string` | — | Override how the chosen value is written on the trigger. |
| `presentation` | `PopoverPresentation` | `popover` | Anchored panel, or a sheet from the bottom of the screen. |
| `disabled` | `boolean` | `false` | Stop the trigger opening it. |
| `disabledDates` | `CalendarDisabled` | — | Days that cannot be picked: a list, a span, or a rule. |
| `minDate` | `Date` | — | Earliest selectable day. |
| `maxDate` | `Date` | — | Latest selectable day. |
| `startMonth` | `Date` | — | Earliest month the `dropdown` caption offers. Defaults to `minDate`. |
| `endMonth` | `Date` | — | Latest month the `dropdown` caption offers. Defaults to `maxDate`. |
| `numberOfMonths` | `number` | `1` | Months side by side inside the panel. |
| `captionLayout` | `CalendarCaptionLayout` | `label` | `dropdown` swaps the month caption for month and year pickers. |
| `weekStartsOn` | `number` | `0` | `0` is Sunday. |
| `selectOutsideDays` | `boolean` | `false` | Let a tap on a neighbouring month's day select it. Off by default. |
| `locale` | `string` | — | BCP 47 tag for the month and weekday names, and for the trigger's text. |
| `calendar` | `CalendarSystem` | `gregory` | Which calendar the months and day numbers are counted in. Forwarded to the grid, and used for the trigger's own text so the two always agree. |
| `className` | `string` | — | — |
| `children` | `ReactElement<{ onPress?: () => void }> \| ReactNode` | — | A trigger of your own. Given one, it is cloned with an `onPress` that opens the panel — so a field row or an icon button can stand in for the default button without this component knowing what either looks like. |

### Example — A date

The trigger reads the chosen date and falls back to the placeholder. One tap finishes it, so the panel closes on the tap.

```tsx
const [day, setDay] = useState<Date>();

<DatePicker selected={day} onSelect={setDay} />
```

### Notes

**It closes when the selection is finished, not when it changes.** A single date is done in one tap, so the panel closes on it. A range needs two and stays open until the second — closing on the first would leave half a range on screen and put someone back where they started. `multiple` never closes on its own; only the caller knows when a set is complete.

**The trigger's text is derived, not stored.** Pass `format` to write it yourself; otherwise it is the short date, both ends of a range, or a count once more than one date is picked.

**`calendar` is forwarded, and used for the trigger too** — a field reading a Gregorian date over a Hijri grid is the bug this exists to prevent.

**Everything the calendar takes is forwarded** — `minDate`, `maxDate`, `disabledDates`, `numberOfMonths`, `captionLayout`, `weekStartsOn` and `locale`.

Reach for **Calendar** on its own when the grid should be on the page rather than behind a control — a booking screen where the month is the screen.

**In a sheet the panel is centred.** A sheet is the full width of the screen and lays its children in a column, so a panel sized to its content would take the cross-axis start and sit flush against one edge — the right-hand one under RTL, directly below the close button.

The calendar inside the panel is unbordered — the panel already draws a surface, and a card inside a card is a seam. `startMonth`, `endMonth` and `selectOutsideDays` are forwarded to it; see [Calendar](/docs/components/calendar) for what each one bounds.

---

Full page, with every example: https://panelui.dev/docs/components/date-picker
