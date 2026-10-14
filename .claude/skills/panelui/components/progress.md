# Progress

Determinate and indeterminate progress bar.

```tsx
import { Progress } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Progress } from '@/components/ui/progress';
```

### Usage

```tsx
<Progress value={uploaded} />
<Progress value={70} color="success" size="lg" />
<Progress value={1250} maxValue={2000} label="Budget" showValueLabel />
<Progress indeterminate color="info" />
```

### Variants

- **color** — `primary` *(default)*, `success`, `warning`, `destructive`, `info`
- **size** — `sm`, `md` *(default)*, `lg`

### Props

#### `ProgressProps`

Extends `Omit<ViewProps, 'children'>, ProgressVariantProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `number` | `0` | Where the work has got to, somewhere between `minValue` and `maxValue`. Ignored when `indeterminate` is set. |
| `minValue` | `number` | `0` | The bottom of the range — the value at which the bar reads as empty. Defaults to `0`. |
| `maxValue` | `number` | `100` | The top of the range — the value at which the bar reads as full. Defaults to `100`, so a bare percentage keeps working with neither bound set. |
| `indeterminate` | `boolean` | `false` | Show a looping animation for unknown-duration work. Under the platform's reduce-motion setting the bar fills the track and pulses instead of travelling across it, so it still reads as running. |
| `indicatorClassName` | `string` | — | Extra classes for the moving indicator. |
| `label` | `string` | — | Caption drawn above the track, on the left. Supplying it (or `showValueLabel`) wraps the bar in a header row; the track alone renders otherwise. |
| `showValueLabel` | `boolean` | `false` | Draw the percentage above the track, on the right. Hidden while `indeterminate` — there is nothing meaningful to show. |
| `valueLabel` | `string` | — | Text for the value label. Overrides the formatted percentage — use it for a byte count, a step tally, anything that is not a bare percent. |
| `formatOptions` | `Intl.NumberFormatOptions` | — | How to write the value, through `Intl.NumberFormat`. A `percent` style formats how far along the bar is; every other style formats the value itself, so `{ style: 'currency', currency: 'USD' }` against a `maxValue` of `2000` reads `$1,250.00` rather than a percentage of it. Falls back to a rounded percent when omitted. |
| `headerClassName` | `string` | — | Extra classes for the label + value-label row. |

### Example — Determinate

`value` against the default range of 0 to 100 — a plain percentage.

```tsx
<Progress value={72} />

<Progress value={uploaded / total * 100} color="success" size="lg" />
```

### Notes

`value` is read against `minValue` and `maxValue`, which default to `0` and `100` — a percentage needs neither. With `indeterminate` the value is ignored, the bar loops, and the value label is dropped. The animation runs on the UI thread. Under reduce motion the fill lands on its value rather than springing to it, and the indeterminate bar fills the track and pulses in place instead of travelling across it — a bar that stopped moving would read as a bar that had hung, which is the one thing an indeterminate bar exists to rule out.

### Writing the value

`formatOptions` renders the readout through `Intl.NumberFormat`. A `percent` style is given how far along the bar is; every other style is given the value itself, so a currency or a byte count comes out as the quantity it is rather than as a proportion of the range. `valueLabel` replaces the whole thing when the text is not a number at all.

Whatever the readout says is also what a screen reader is told, alongside the real range — so a bar counting seats reads "18 of 24" rather than "75".

---

Full page, with every example: https://panelui.dev/docs/components/progress
