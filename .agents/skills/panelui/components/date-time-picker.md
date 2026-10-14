# DateTimePicker

A day and a time of day, picked in one panel.

```tsx
import { DateTimePicker } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { DateTimePicker } from '@/components/ui/date-time-picker';
```

### Usage

```tsx
const [when, setWhen] = useState<Date>();

<DateTimePicker value={when} onValueChange={setWhen} />
```

### Parts

- `DateTimePicker.Trigger` — Wrap your own trigger in it to replace the default button. It is `Popover.Trigger` — the same part `DatePicker` and `TimePicker` re-export, so a field row written for one works for all three.

### Props

#### `DateTimePickerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `Date` | — | Controlled value. One `Date` carrying both halves. |
| `defaultValue` | `Date` | — | Starting value when uncontrolled. |
| `onValueChange` | `(value: Date) => void` | — | Fires on every change to either half, not on Done. Done closes the panel; it does not decide anything the caller has not already been told. |
| `layout` | `TimePickerLayout` | `ruler` | Which face the time is picked on. `ruler` is the one that fits here. |
| `presentation` | `DateTimePickerPresentation` | `popover` | Anchored panel, a sheet, a dialog, or the panel with nothing around it. |
| `open` | `boolean` | — | Controlled open state of the panel. |
| `onOpenChange` | `(open: boolean) => void` | — | — |
| `hourCycle` | `HourCycle` | `12` | `12` shows a meridiem, `24` does not. The value is 24-hour either way. |
| `minuteStep` | `number` | — | Minutes between one selectable time and the next. |
| `minTime` | `TimeValue` | — | Earliest selectable time of day, inclusive. |
| `maxTime` | `TimeValue` | — | Latest selectable time of day, inclusive. |
| `placeholder` | `string` | `Pick a date and time` | What the trigger reads when nothing has been chosen. |
| `format` | `(value: Date) => string` | — | Override how the chosen value is written on the trigger. |
| `disabled` | `boolean` | `false` | Stop the trigger opening it, and the panel from being used. |
| `disabledDates` | `CalendarDisabled` | — | Days that cannot be picked: a list, a span, or a rule. |
| `minDate` | `Date` | — | Earliest selectable day. |
| `maxDate` | `Date` | — | Latest selectable day. |
| `captionLayout` | `CalendarCaptionLayout` | `label` | `dropdown` swaps the month caption for month and year pickers. |
| `weekStartsOn` | `number` | `0` | `0` is Sunday. |
| `locale` | `string` | — | BCP 47 tag for the month names, the time and the trigger's own text. |
| `calendar` | `CalendarSystem` | `gregory` | Which calendar the months and day numbers are counted in. |
| `doneLabel` | `string` | `Done` | Label on the button that closes the panel. |
| `timeLabel` | `string` | `Time` | What the time half of the panel is called, above its face. The date half names itself with the month it is showing; the time half has nothing that would say what it is otherwise. |
| `className` | `string` | — | — |
| `children` | `ReactElement<{ onPress?: () => void }> \| ReactNode` | — | A trigger of your own. Given one, it is cloned with an `onPress` that opens the panel — so a field row or an icon button can stand in for the default button without this component knowing what either looks like. Ignored by `presentation="inline"`, which has no trigger. |

### Example — One value, filled in from either end

`onValueChange` fires on every change to either half, not on Done — Done closes the panel, it does not decide anything the caller has not already been told.

The halves can be filled in either order. A day picked first takes the top of the current hour until the time is touched; a time picked first means **today**, because a time is not a `Date` without a day and the day the reader is looking at is the only defensible guess. The alternative — emitting nothing until both halves have been touched — is a form that silently does nothing when you use it in the order it did not expect.

```tsx
const [when, setWhen] = useState<Date>();

<DateTimePicker
  value={when}
  onValueChange={setWhen}
  placeholder="Pick a date and time"
/>
```

### Notes

### It does not close on the date

[DatePicker](/docs/components/date-picker) closes as soon as a single day is tapped, because at that point there is nothing left to say. Here there is: the day is half the value, and closing on it would hide the other half at the moment it became relevant.

So the panel stays until Done — in every presentation, including the popover, which is the one place `DatePicker` has no Done button at all. Tapping outside still dismisses it, but that is how a popover is *abandoned*, and something has to say when both halves are settled.

### Disabled applies to the whole panel

`disabled` prevents changes from both the calendar and the time control, including `presentation="inline"` and a controlled panel that remains open while disabled. It does not merely disable the default trigger.

### The panel is a fixed width

That is what lets the two halves line up. A month grid and a time scale that each measured themselves would be two boxes of slightly different widths stacked on each other, and the seam shows at any size. The hairline between them is a hairline rather than a gap for the same reason: space alone reads as two controls that happen to be near each other.

### The value is a `Date`, the time is not

The component's value is one `Date` carrying both halves, because that is what a caller stores and sends. Inside, and in `minTime` / `maxTime`, a time of day is `{ hour, minute }` on a 24-hour clock — a `Date` cannot hold a time without also holding a day, and the two conversions that forces on every caller are where the daylight-saving bugs live. `hourCycle` decides whether a meridiem is shown; it does not change what is stored.

### When two fields are still the right answer

If the day and the time are genuinely separate decisions — a recurring event's day-of-week and its time, a filter with an optional time — keep them apart. This component is for the case where one moment is being chosen and half of it is not an answer.

### The time is written once, not twice

The panel takes the ruler's own readout off (`readout="none"` on the TimePicker inside it) and states the time in the row above the scale instead. A month caption is 16pt and a date is 14pt; the ruler's readout on its own is 36pt, and left in place it would be the largest thing in the panel standing for the smaller half of the value. The row is the same fact at a size that sits under the date rather than over it.

---

Full page, with every example: https://panelui.dev/docs/components/date-time-picker
