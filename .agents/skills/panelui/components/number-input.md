# NumberInput

Numeric field stepped by buttons or typed by hand.

```tsx
import { NumberInput } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { NumberInput } from '@/components/ui/number-input';
```

### Usage

```tsx
<NumberInput defaultValue={1} min={0} max={10} />

const [qty, setQty] = useState(1);
<NumberInput label="Quantity" value={qty} onValueChange={setQty} min={1} />
```

### Variants

- **variant** — `outline` *(default)*, `filled`
- **size** — `sm`, `md` *(default)*, `lg`
- **invalid** — `true`
- **disabled** — `true`

### Props

#### `NumberInputProps`

Extends `Omit<NumberInputVariantProps, 'invalid' \| 'disabled'>, Pick<TextInputProps, 'onFocus' \| 'onBlur' \| 'placeholder' \| 'returnKeyType'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `containerClassName` | `string` | — | — |
| `value` | `number` | — | Controlled value. Leave unset and pass `defaultValue` to run uncontrolled. |
| `defaultValue` | `number` | — | Starting value when uncontrolled. Defaults to `min`, or 0. |
| `min` | `number` | `-Infinity` | Lower bound. The decrement button disables here. |
| `max` | `number` | `Infinity` | Upper bound. The increment button disables here. |
| `step` | `number` | `1` | Nudge per press, and the granularity the value snaps to. |
| `onValueChange` | `(value: number) => void` | — | Fires whenever the committed value changes. |
| `formatValue` | `(value: number) => string` | — | Format the displayed number — units, currency, grouping. The field shows this string; typing still reads a bare number back. Defaults to the value rounded to `step`'s precision. |
| `editable` | `boolean` | `true` | Let the middle field be typed into. When false it is display-only. |
| `disabled` | `boolean` | — | — |
| `label` | `string` | — | A label above the control. Doubles as the accessibility label. |
| `description` | `string` | — | Helper text below the control. Hidden while an error shows. |
| `errorMessage` | `string` | — | Error message. When set, the control renders in its invalid state. |
| `isRequired` | `boolean` | — | Marks the field required — an asterisk on the label, and the a11y state. |
| `haptics` | `boolean` | — | Tick the haptic engine on each step. Needs the optional `expo-haptics`, and is silent without it. |

### Example — Controlled

Hold the value in state and read it back. Every commit — a tap, a hold, or a typed entry — arrives already clamped and snapped.

```tsx
const [qty, setQty] = useState(1);

<NumberInput value={qty} onValueChange={setQty} min={1} max={99} />
```

### Notes

Runs controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`). The value is always clamped to `[min, max]` and snapped to the nearest `step`; the display rounds to `step`'s precision, so `0.1 + 0.2` settles on `0.3` rather than drifting.

Typing is allowed to be briefly invalid — an empty field, a lone `-`, a trailing `.` — because clamping every keystroke fights the person mid-number. The field commits on blur or submit, and reverts to the last good value when what is left cannot be read as a number.

The buttons repeat when held, and read the live value from a ref so a hold never strides off a stale number. Each is a separately labelled accessibility button that disables at its bound, so a screen reader is told when a direction is exhausted.

Pass `haptics` to tick on each step; it needs the optional `expo-haptics` and is silent without it.

---

Full page, with every example: https://panelui.dev/docs/components/number-input
