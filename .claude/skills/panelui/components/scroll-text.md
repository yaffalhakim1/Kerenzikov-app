# ScrollText

Text that resolves word by word as you scroll.

```tsx
import { ScrollText } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { ScrollText } from '@/components/ui/scroll-text';
```

### Usage

```tsx
<ScrollProgress>
  <ScrollView>
    <ScrollText size="2xl" weight="semibold">
      Every control ships with its accessibility wiring already done.
    </ScrollText>
  </ScrollView>
</ScrollProgress>
```

### Props

#### `ScrollTextProps`

Extends `Omit<TextProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `string` | `` | The sentence. Split into words or characters, then revealed across them. |
| `effect` | `ScrollTextEffect` | `color` | `color` crossfades each word between two colours, `fade` brings it up from transparent, `rise` lifts it into place, `highlight` sweeps a background behind it. |
| `by` | `ScrollTextSplit` | `word` | Reveal a word at a time, or a character at a time. |
| `from` | `string` | — | Colour before a word is reached. Defaults to the muted foreground token. |
| `to` | `string` | — | Colour once it has been. Defaults to the foreground token. |
| `start` | `number` | `0.9` | Where down the viewport the block's top sits when the reveal starts, as a fraction of the viewport height. |
| `end` | `number` | `0.5` | Where its bottom sits when the reveal completes. Smaller is a longer scrub. |
| `stagger` | `number` | `0.35` | How much of the whole reveal a single word takes, `0` to `1`. Small values make a hard edge travelling along the line; large ones make the whole sentence brighten together. |
| `progress` | `SharedValue<number>` | — | Drive the reveal from a value of your own rather than from scroll — a progress bar, a gesture, a timeline. |
| `enabled` | `boolean` | `true` | Set false to render the text resolved, with no effect at all. |

### Example — Wiring up the scroll position

`ScrollProgress` wraps the scroll view you already have rather than replacing it — the child is cloned with an animated scroll handler composed onto it, so a `FlatList`, a `SectionList` or your own scrollable all work and your own `onScroll` is kept. One listener serves every effect inside it.

```tsx
<ScrollProgress className="flex-1">
  <ScrollView>
    <ScrollText>…</ScrollText>
    <ScrollCanvas source={{ uri }} />
  </ScrollView>
</ScrollProgress>
```

### Notes

### Two layouts, and why

`color`, `fade` and `highlight` render the words as nested `Text` inside one parent, which is the only way React Native will break them into real lines. Nested text cannot be transformed, though — a `translateY` on it is simply ignored.

So `rise` lays the words out as a wrapping row of separate views instead. That buys transforms and costs real line-breaking: words wrap on their own boundaries and the spacing is a margin rather than a space. Worth knowing before reaching for it on a paragraph rather than a heading.

### Measurement

The block is measured on the UI thread whenever the scroll position changes — not every frame, and not once at layout. Once is wrong the moment anything above it resizes; every frame is a measurement pass for a value that only changes when the scroller moves.

`useReducedMotion` renders the text fully resolved, with no effect at all. So does `enabled={false}` — the text is always readable, which is the one thing an effect on text must never take away.

---

Full page, with every example: https://panelui.dev/docs/components/scroll-text
