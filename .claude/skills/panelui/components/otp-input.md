# OtpInput

One-time-code field drawn as a row of separate cells.

```tsx
import { OtpInput } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { OtpInput } from '@/components/ui/otp-input';
```

### Usage

```tsx
const [code, setCode] = useState('');

<OtpInput value={code} onChangeText={setCode} onComplete={submit} />

// Four masked cells, grouped two and two, letters allowed.
<OtpInput length={4} mask groupEvery={2} type="text" />
```

### Variants

- **size** — `sm`, `md` *(default)*, `lg`
- **disabled** — `true`

### Props

#### `OtpInputProps`

Extends `Omit< TextInputProps, 'value' \| 'defaultValue' \| 'onChangeText' \| 'maxLength' \| 'children' >, Omit<OtpVariantProps, 'disabled'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `cellClassName` | `string` | — | Class applied to every cell — for a taller box or a different radius. |
| `length` | `number` | `6` | How many cells, i.e. the length of the code. |
| `value` | `string` | — | Controlled value. Longer strings and stray characters are trimmed to fit. |
| `defaultValue` | `string` | `` | Starting value when the field manages its own state. |
| `onChangeText` | `(value: string) => void` | — | — |
| `onComplete` | `(value: string) => void` | — | Fires once, the moment the last cell is filled. |
| `type` | `'numeric' \| 'text'` | `numeric` | What the keyboard offers and what the field accepts. `numeric` keeps digits only and asks for the number pad; `text` accepts any character. |
| `mask` | `boolean` | `false` | Hide each filled character behind a dot, the way a passcode field does. |
| `placeholder` | `string` | — | A single character shown, dimmed, in every cell still waiting for input. |
| `groupEvery` | `number` | `0` | Draw a separator between groups of this many cells — 3 gives `xxx — xxx`. |
| `disabled` | `boolean` | — | — |
| `isInvalid` | `boolean` | — | Tint the field in its error colour and announce it as invalid. |
| `errorMessage` | `string` | — | Error line under the field. Setting it also puts the field in its invalid state. |
| `accessibilityLabel` | `string` | — | Announced by a screen reader as the field's name. |

### Example — Controlled

Hold the value yourself and act on it when the code completes.

```tsx
const [code, setCode] = useState('');

<OtpInput
  value={code}
  onChangeText={setCode}
  onComplete={(value) => verify(value)}
/>
```

### Notes

Accepts most `TextInputProps` — they land on the hidden field — except the ones `OtpInput` owns: `value`, `defaultValue`, `onChangeText`, `maxLength` and `children`. Setting `editable={false}` also makes the native field read-only, while `disabled` always takes precedence and keeps it non-editable.

The field is controlled when you pass `value`, and manages its own state otherwise (seed it with `defaultValue`). Either way the string is trimmed to `length` and, when `type="numeric"`, filtered to digits, so an over-long paste or a stray character can never put the cells and the value out of step.

`onComplete` fires once, on the transition to a full code — not on every keystroke that leaves it full — which is the right moment to submit or verify. The hidden input carries `textContentType="oneTimeCode"` and the matching `autoComplete`, so iOS offers the SMS code above the keyboard and Android autofills it.

---

Full page, with every example: https://panelui.dev/docs/components/otp-input
