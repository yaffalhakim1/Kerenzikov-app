# Direction

Reading direction for everything below it.

```tsx
import { Direction } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Direction } from '@/components/ui/direction';
```

### Usage

```tsx
<Direction dir="rtl">
  <App />
</Direction>
```

### Props

#### `DirectionProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |
| `dir` | `DirectionValue` | — | Reading direction for this subtree. Defaults to the nearest enclosing `Direction`, or to the device when there is none — so a nested provider with no `dir` inherits rather than resetting to left-to-right. |

### Example — At the root

Wrap the app once. The wrapper takes no layout of its own, so give it `flex-1` here — it is standing in for the screen.

```tsx
<PanelUIProvider>
  <Direction dir={locale.rtl ? 'rtl' : 'ltr'} className="flex-1">
    <App />
  </Direction>
</PanelUIProvider>
```

### Notes

### What it mirrors for you

The wrapper carries Yoga’s `direction`, so every row, `start`/`end` inset and logical padding underneath it mirrors natively — that is the whole reason this is a component and not a bare context. `direction` is a *style*, and a subtree is the unit a style applies to.

It is also why this beats flipping the process with `I18nManager.forceRTL`, which needs an app restart, cannot be scoped to part of a screen, and cannot be previewed side by side. Here the value is a prop: change it and the next frame is mirrored.

### What the library flips on top of that

Yoga only moves boxes. Everything below is a number or a glyph rather than a laid-out edge, and each one reads the direction itself:

- **Text alignment.** React Native resolves a paragraph’s alignment from the process-wide `I18nManager.isRTL`, not from an ancestor’s Yoga direction — so without this an Arabic paragraph would mirror the furniture around it and then sit left-aligned inside it. Every `Text` in the library sets its `writingDirection` from the nearest `Direction`.
- **Chevrons and arrows.** Yoga moves a chevron to the other end of its row but cannot turn the glyph around, which leaves an RTL list row pointing back at its own text. The glyphs whose meaning *is* a horizontal direction mirror — the two chevrons, the outward arrow and the send plane. A pencil, a magnifier or a play triangle does not, because those mean the same thing either way round, and the vertical arrows do not either, since the vertical axis has no direction to read.
  The mirror is written as a transform on every render rather than only in right-to-left, so an app that switches direction at runtime gets its arrows back when it switches away again.
- **Slider, Switch, Progress and Shimmer.** A drag translation, a thumb’s travel, a loop and a sweep are all transforms, and a transform is not laid out. Each multiplies through the direction’s sign.

Anything of your own doing the same kind of maths needs `useDirectionSign()`, which is the whole of the escape hatch.

### Inheritance

A nested `Direction` with no `dir` inherits rather than resetting to left-to-right, so wrapping a section in one to add a `className` does not silently unflip it. Pass `dir` explicitly for an island that must not flip — an identifier, a phone number, a code block — since those read the same way in every locale and mirroring them makes them wrong rather than localised.

### It takes no layout of its own

The view is as big as what is inside it; `className` says otherwise. Wrapping a whole app therefore wants `flex-1` explicitly. It used to carry `flex-1` by default and every use inside a screen had to undo it with `flex-none` — a default that is wrong for one of its two uses is worse than none, because the wrong one fails silently by swallowing the rest of the screen.

### What it does not do

It mirrors the furniture. The content is still yours to translate, and dates, numbers and currency still need formatting for the locale — a mirrored screen reading English is not a localised app.

---

Full page, with every example: https://panelui.dev/docs/components/direction
