# Rating

A row of stars to read or set a score.

```tsx
import { Rating } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Rating } from '@/components/ui/rating';
```

### Usage

```tsx
<Rating defaultValue={3} />
<Rating value={score} onValueChange={setScore} />
<Rating value={4.5} precision={0.5} readOnly />
<Rating label="Rate your stay" showValue defaultValue={0} />
```

### Variants

- **size** — `sm`, `md` *(default)*, `lg`
- **disabled** — `true`

### Props

#### `RatingProps`

Extends `Omit<RatingVariantProps, 'disabled'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `number` | — | Controlled value. Leave unset and pass `defaultValue` to run uncontrolled. |
| `defaultValue` | `number` | `0` | Starting value when uncontrolled. |
| `max` | `number` | `5` | How many stars. |
| `precision` | `number` | `1` | Smallest step a tap can pick, as a fraction of a star. `1` is whole stars, `0.5` lets the left half of a star mean a half. Reading a value renders any precision — this only constrains what a finger can set. |
| `onValueChange` | `(value: number) => void` | — | Fires as the value changes, including live while dragging. |
| `onValueCommit` | `(value: number) => void` | — | Fires once when a tap or drag ends — the place for expensive side effects. |
| `readOnly` | `boolean` | `false` | Show the stars but ignore touches — the display half of the component. |
| `disabled` | `boolean` | `false` | — |
| `allowClear` | `boolean` | `false` | Let a second tap on the current value clear it back to zero, so a rating given by mistake can be taken back without a separate control. |
| `color` | `RatingColor` | `warning` | Which token the filled stars are painted with. |
| `label` | `string` | — | Caption above the stars. Also becomes the accessibility label. |
| `showValue` | `boolean` | `false` | Show the numeric value on the caption row, opposite the label. |
| `formatValue` | `(value: number) => string` | — | Format the shown value. Defaults to the number as written. |
| `haptics` | `boolean` | `false` | A tick under the finger each time a drag crosses onto a new star. Off by default — needs the optional `expo-haptics`, and is silent without it. |
| `headerClassName` | `string` | — | Extra classes for the caption row. |
| `rowClassName` | `string` | — | Extra classes for the row of stars. |

### Example — Controlled

Hold the value in state and read it back.

```tsx
const [score, setScore] = useState(3);

<Rating value={score} onValueChange={setScore} />
```

### Notes

Runs controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`). `onValueChange` fires live while dragging; `onValueCommit` fires once when the tap or drag ends — reach for it when the change is expensive.

`precision` only constrains what a finger can set; a read value renders at any precision, so a computed 4.3 average shows four-and-a-bit stars even though a tap can only pick whole or half stars. Invalid or non-positive precision falls back to `1`.

`max` is normalized to a positive whole number because it is both the rendered star count and the accessibility maximum. Invalid values fall back to `5`, and fractional counts round down. Non-finite ratings render safely as zero; finite values are clamped to the normalized range.

Set `readOnly` for a pure display and the row is announced as an image rather than an adjustable control; set `allowClear` to let a second tap on the current value reset it to zero.

---

Full page, with every example: https://panelui.dev/docs/components/rating
