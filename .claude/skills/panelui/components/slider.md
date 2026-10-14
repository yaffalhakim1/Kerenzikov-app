# Slider

Pick a value, or a span, by dragging a thumb along a track.

```tsx
import { Slider } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Slider } from '@/components/ui/slider';
```

### Usage

```tsx
<Slider defaultValue={40} />
<Slider label="Volume" showValue defaultValue={40} />
<Slider value={volume} onValueChange={setVolume} />
<Slider defaultRange={[20, 80]} onRangeCommit={save} />
```

### Variants

- **color** — `primary` *(default)*, `success`, `warning`, `destructive`, `info`
- **size** — `sm`, `md` *(default)*, `lg`
- **disabled** — `true`

### Props

#### `SliderProps`

Extends `Omit<SliderVariantProps, 'disabled'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `number` | — | Controlled value. Leave unset and pass `defaultValue` to run uncontrolled. |
| `defaultValue` | `number` | `0` | Starting value when uncontrolled. |
| `range` | `[number, number]` | — | Controlled span, as `[low, high]`. Passing this — or `defaultRange` — gives the slider two thumbs and fills between them instead of from the start. |
| `defaultRange` | `[number, number]` | — | Starting span when uncontrolled, as `[low, high]`. |
| `min` | `number` | `0` | Lower bound. |
| `max` | `number` | `100` | Upper bound. |
| `step` | `number` | `1` | Snap granularity. The value is always a multiple of `step` from `min`. |
| `minStepsBetweenThumbs` | `number` | `0` | How many steps the two thumbs must stay apart on a range slider. `0` lets them meet; `1` keeps a step between them, so the span is never empty. |
| `onValueChange` | `(value: number) => void` | — | Fires on every change while dragging — cheap updates only. |
| `onValueCommit` | `(value: number) => void` | — | Fires once when the gesture ends — the place for expensive side effects. |
| `onRangeChange` | `(range: [number, number]) => void` | — | The range equivalent of `onValueChange`. Only fires on a range slider. |
| `onRangeCommit` | `(range: [number, number]) => void` | — | The range equivalent of `onValueCommit`. Only fires on a range slider. |
| `disabled` | `boolean` | `false` | — |
| `native` | `boolean` | — | Render the platform's own slider instead of this one. Requires the optional `@expo/ui` package; without it this prop does nothing. **Theme tokens do not apply** — the platform draws the control, so `color`, `size` and the slot classNames are ignored. `label` and `showValue` still render the caption row above it, since that is ours. **Ignored on a range slider.** Neither platform ships a two-thumb slider, so a range draws ours rather than quietly losing a thumb. |
| `label` | `string` | — | Caption above the track. Also becomes the accessibility label. |
| `showValue` | `boolean` | `false` | Show the current value on the caption row, opposite the label. |
| `formatValue` | `(value: number) => string` | — | Format the shown value. Defaults to the rounded number. |
| `haptics` | `boolean` | `false` | A tick under the finger each time a drag crosses onto a new step, and once more when the drag ends. Off by default — needs the optional `expo-haptics`, and is silent without it. |
| `headerClassName` | `string` | — | Extra classes for the caption row. |
| `trackClassName` | `string` | — | Extra classes for the unfilled track. |
| `fillClassName` | `string` | — | Extra classes for the filled portion. |
| `thumbClassName` | `string` | — | Extra classes for the draggable thumb. |
| `knobClassName` | `string` | — | Extra classes for the knob inside the thumb. |

### Example — Controlled

Hold the value in state and read it back for a live label.

```tsx
const [volume, setVolume] = useState(40);

<Slider value={volume} onValueChange={setVolume} />
```

### Notes

Runs controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`). `onValueChange` fires on every frame of a drag; `onValueCommit` fires once on release — reach for it when the change is expensive. The value is always snapped to a multiple of `step` from `min`.

**A range is a second pair of props, not a tuple in the first.** Passing `range` or `defaultRange` gives the slider two thumbs and reports through `onRangeChange` / `onRangeCommit`. Keeping them apart is what lets a one-thumb slider's handler stay `(value: number) => void` — a single set of props covering both would hand every existing caller a union to narrow before they could read a number out of it.

The knob is painted with the page background rather than a per-colour on-token, because the status foregrounds are the darker text hues meant for soft fills — a green-700 knob on a green-500 pill would barely show. Override `knobClassName` if a theme needs something else.

See [Native rendering](/docs/native) for what `native` keeps and what it gives up — notably `onValueCommit`, which the platform control does not report. `native` is ignored on a range slider: neither platform ships a two-thumb control, so a range draws ours rather than quietly losing a thumb.

---

Full page, with every example: https://panelui.dev/docs/components/slider
