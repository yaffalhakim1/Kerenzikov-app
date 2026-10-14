# TextAnimation

Five ways a piece of text or a number arrives.

```tsx
import { TextAnimation } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { TextAnimation } from '@/components/ui/text-animation';
```

### Anatomy

```tsx
{/* each part on its own */}
<TextAnimation.Typing text="…" />
<TextAnimation.Rotating text={[…]} />
<TextAnimation.Counting value={0} />
<TextAnimation.Sliding value={0} />
<TextAnimation.Scrolling value={0} step={1} />

{/* or several, sharing one configuration */}
<TextAnimation duration={900} delay={200}>
  <TextAnimation.Counting value={48} />
  <TextAnimation.Counting value={60} />
</TextAnimation>
```

### Parts

- `TextAnimation.Typing` — A string arriving one character at a time, with an optional caret that flows with the text — including onto the second line. Given an array it types each in turn, holds it, erases it and moves on.
- `TextAnimation.Rotating` — One phrase replaced by the next, the outgoing one leaving upward and the incoming one arriving from below. The box is sized by the longest phrase, so it neither resizes as the words change nor clips the ones that do not fit the first.
- `TextAnimation.Counting` — A number counting up to itself, formatted through `Intl.NumberFormat` where you give it options.
- `TextAnimation.Sliding` — An odometer: every digit is a column of ten, and each rolls to the one it should be showing.
- `TextAnimation.Scrolling` — A column of values scrolling past a window and coming to rest on one, with its neighbours either side of it. `highlight` marks the chosen one and the edges fade into the surface behind them, which together are what make it read as a scale with an answer in it rather than a list of five numbers.

### Props

#### `TextAnimationProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `duration` | `number` | — | How long one pass takes, in milliseconds. What that measures depends on the part: a keystroke for `Typing`, a phrase's turn on screen for `Rotating`, the whole journey for the three that count. |
| `delay` | `number` | — | How long to wait before starting, in milliseconds. |
| `loop` | `boolean` | — | Start again from the beginning when the run finishes. |
| `enabled` | `boolean` | — | Animate at all. `false` draws the finished text or the final number immediately, which is also what a reduced-motion setting does. |
| `children` | `ReactNode` | — | — |

#### `TextAnimationTypingProps`

Extends `Omit<TextProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `text` | `string \| string[]` | **required** | What to type. An array is typed, held, erased and replaced by the next, which is the shape a rotating headline wants. |
| `duration` | `number` | — | Milliseconds per keystroke. |
| `delay` | `number` | — | Milliseconds before the first keystroke. |
| `hold` | `number` | `1400` | How long a finished string sits before it is erased, in milliseconds. |
| `loop` | `boolean` | — | Start again after the last string. Only means anything for an array. |
| `caret` | `boolean` | `false` | Draw a blinking caret after the text. |
| `caretClassName` | `string` | — | Styles the caret. |
| `onDone` | `() => void` | — | Called once the last string has finished being typed. |
| `enabled` | `boolean` | — | — |

#### `TextAnimationRotatingProps`

Extends `Omit<TextProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `text` | `string \| string[]` | **required** | The phrases to cycle. One string never rotates, which is a valid state. |
| `duration` | `number` | — | How long each phrase holds, in milliseconds. |
| `delay` | `number` | — | Milliseconds before the first change. |
| `enabled` | `boolean` | — | — |

#### `TextAnimationCountingProps`

Extends `Omit<TextProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `number` | **required** | Where the number ends up. |
| `from` | `number` | `0` | Where it starts from. Defaults to zero. |
| `duration` | `number` | — | How long the whole journey takes, in milliseconds. |
| `delay` | `number` | — | Milliseconds before it starts. |
| `decimals` | `number` | `0` | Digits after the point. |
| `formatOptions` | `Intl.NumberFormatOptions` | — | Formatting for the number, as `Intl.NumberFormat` options — a currency, a percentage, grouped thousands. Falls back to a plain fixed-point string on an engine whose `Intl` cannot do it. |
| `enabled` | `boolean` | — | — |

#### `TextAnimationSlidingProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `number` | **required** | The number to show. Each digit rolls to its new value independently. |
| `decimals` | `number` | `0` | Digits after the point. |
| `padStart` | `number` | `1` | Pad the whole part to this many digits with leading zeroes. |
| `thousandSeparator` | `string` | — | A separator every three digits — `','` for `1,024`. |
| `decimalSeparator` | `string` | `.` | The decimal mark. |
| `textClassName` | `string` | — | Styles the digits. |
| `size` | `TextProps['size']` | — | Size of the digits, as on `Text`. |
| `weight` | `TextProps['weight']` | — | Weight of the digits, as on `Text`. |
| `delay` | `number` | — | Milliseconds before the roll starts. |
| `enabled` | `boolean` | — | — |

#### `TextAnimationScrollingProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `number` | **required** | The value to land on. |
| `step` | `number` | `1` | The gap between the values either side of it. |
| `around` | `number` | `2` | How many values to show above and below the one in the window. |
| `duration` | `number` | — | How long the run takes, in milliseconds. |
| `delay` | `number` | — | Milliseconds before it starts. |
| `formatOptions` | `Intl.NumberFormatOptions` | — | Formatting for each value, as `Intl.NumberFormat` options. |
| `textClassName` | `string` | — | Styles the values. |
| `size` | `TextProps['size']` | — | Size of the values, as on `Text`. |
| `weight` | `TextProps['weight']` | — | Weight of the values, as on `Text`. |
| `highlight` | `boolean` | `false` | Draw a band behind the value in the window, so the one being chosen is told apart from the scale around it. |
| `highlightClassName` | `string` | — | Styles that band. |
| `fadeColor` | `string \| false` | `--color-background` | What the top and bottom of the window fade into — a theme token name, or any colour. It has to be told: the fade is painted, so it can only be the right colour if it is the colour of whatever is behind the window. Defaults to `--color-background`; pass `--color-card` inside a card. `false` turns the fade off, for a window on a surface that is not one flat colour. |
| `enabled` | `boolean` | — | — |

### Example — Typed, with a caret

The caret is solid while characters are arriving and blinks while they are not, which is what says *waiting* rather than *finished*. It is nested inside the text rather than laid out beside it: as a sibling it would sit against the right of the whole block, and the moment a line wrapped it would stop being after the last character. As a glyph in the flow it lands wherever typing has got to, on whichever line that is — and it is sized by the font, so it is right at every text size without being told any of them.

Give the line a height. `Typing` reserves no space, so a line that grows as it types pushes everything under it down the screen on every keystroke.

```tsx
<View className="h-16 justify-center">
  <TextAnimation.Typing
    text="Everything ships with its accessibility wiring already done."
    size="lg"
    weight="medium"
    caret
  />
</View>
```

### Notes

### Where the work happens

A number animated as React state is a re-render per frame. `Counting` runs the value on the UI thread and crosses back only when the *rounded* number changes — for a whole number that is a couple of dozen times over the run rather than sixty a second. `Sliding` and `Scrolling` never cross back at all: every digit is already rendered and the animation is a transform on a column of them.

`Typing` is the exception, and has to be. A character is a different string, and a string is a re-render whichever thread decided on it. At a keystroke every fifty-odd milliseconds that is three orders of magnitude slower than a frame.

### Nothing is measured

A sliding column is ten digits tall and is moved by a percentage of its own height, so a digit lands in the window whatever the font size turns out to be — no `onLayout`, and no first frame at the wrong offset. The window's size comes from one hidden `0` laid out in flow, which is also what makes it exactly as wide and as tall as a digit in the current font rather than as wide as a number happens to be.

### The digits do not move sideways

Every numeric part draws in `tabular-nums`. Proportional digits are different widths, so a rolling number changes width as it rolls and shoves whatever is beside it back and forth — which reads as the layout being broken rather than as the number being alive.

### What a screen reader gets

The final value, not the animation. A counter is labelled with the number it is heading for, a sliding column with the whole number rather than four columns of ten digits each, and a rotating phrase list announces only the phrase on screen. The caret is hidden outright.

### Reduced motion

Every part draws its finished state immediately and nothing loops. `enabled={false}` does the same thing on demand — useful for a screenshot, or for a list where the same effect on forty rows would be a fairground rather than an accent.

---

Full page, with every example: https://panelui.dev/docs/components/text-animation
