# CircularText

Text set around a circle, turning.

```tsx
import { CircularText } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { CircularText } from '@/components/ui/circular-text';
```

### Usage

```tsx
<CircularText radius={90} textClassName="text-base font-bold tracking-widest">
  PANELUI · COMPONENTS FOR REACT NATIVE ·
</CircularText>
```

### Props

#### `CircularTextProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `string` | **required** | The text to set around the circle. A string, not elements: each character is placed and turned on its own, so there is nothing for markup inside it to apply to. |
| `radius` | `number` | — | Points from the centre of the ring to the outside of the text. It is also half the component's width and height — the ring is a square that measures `radius * 2` on both axes, and the characters hang inside its edge. Nothing is laid out around it, so give the space it needs. |
| `spinDuration` | `number` | — | Milliseconds for one full turn. Slow by default: it is decoration, and a ring that turns at the speed of a spinner reads as something loading. |
| `reverse` | `boolean` | `false` | Turn anticlockwise. |
| `paused` | `boolean` | `false` | Hold the ring where it is. It stops in place rather than returning to the top, and resumes from there, so a ring paused mid-word is still on that word when it starts again. |
| `spread` | `number` | — | Degrees of the circle the text is spread across. The whole way round by default. A full turn has no last gap, since the end of the string is adjacent to its start. Anything less is an arc with two ends, and the text reaches both of them. |
| `startAngle` | `number` | `0` | Degrees clockwise from the top that the first character sits at. |
| `className` | `string` | — | Classes for the ring's own box. |
| `textClassName` | `string` | — | Classes for the characters — size, weight, colour, tracking. |

### Example — A mark in the middle

The ring draws nothing inside itself, so anything in the centre is a second layer rather than a child. Stack them and centre both: the ring turns, the mark does not.

```tsx
<View className="h-[180px] w-[180px] items-center justify-center">
  <CircularText
    radius={90}
    spinDuration={24000}
    textClassName="text-base font-bold tracking-[0.2em]"
  >
    PANELUI · COMPONENTS FOR REACT NATIVE ·
  </CircularText>
  <Text size="2xl" weight="bold" className="absolute">
    P
  </Text>
</View>
```

### Notes

**With the operating system set to reduce motion the ring is drawn once and held still.** Not a slower turn — none. The shape carries the whole meaning, and the rotation is exactly the part that setting exists to remove.

`spinDuration` is milliseconds for one full turn, and the default of 20 seconds is deliberately slow. A ring turning at the speed of a spinner reads as something loading.

**The characters are drawn a step larger than body text**, because text bent round a circle is read a letter at a time rather than as a word, and at body size the ring reads as a texture instead of as a phrase. `textClassName` overrides it.

**`radius` is also half the component's width and height.** The ring is a square that measures `radius * 2` on both axes, and the characters hang inside its edge — so a larger text size moves them inward rather than making the component bigger. Nothing is laid out around the ring, so give it the space it needs.

The text is announced once, as a single label. The characters are hidden from assistive technology as a group, because a ring read out character by character is a string spelled one letter at a time.

Give it a string, not elements. Each character is placed and turned on its own, so there is nothing inside for markup to apply to; style the whole set with `textClassName`.

A non-finite `radius`, `spinDuration` or `spread` falls back to its default, and a negative one is treated as zero, so bad data cannot produce a transform that never resolves. `spread` is clamped to a full turn: past that the characters would overlap the ones already there.

---

Full page, with every example: https://panelui.dev/docs/components/circular-text
