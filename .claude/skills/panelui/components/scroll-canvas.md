# ScrollCanvas

Image frame whose contents move as you scroll.

```tsx
import { ScrollCanvas } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { ScrollCanvas } from '@/components/ui/scroll-canvas';
```

### Usage

```tsx
<ScrollProgress>
  <ScrollView>
    <ScrollCanvas source={{ uri }} effect="parallax" />
  </ScrollView>
</ScrollProgress>
```

### Props

#### `ScrollCanvasProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `source` | `ImageSourcePropType` | — | The image. Ignored by `sequence`, which reads `sources` instead. |
| `sources` | `ImageSourcePropType[]` | — | The frames a `sequence` scrubs through, in order. Keep it to a couple of dozen — every frame is a decoded bitmap held in memory for the whole time the canvas is mounted. |
| `effect` | `ScrollCanvasEffect` | `parallax` | Which of the four scroll effects to apply. |
| `aspectRatio` | `number` | `16 / 10` | Width ÷ height of the frame. |
| `distance` | `number` | `1` | Multiplier on how far the effect travels. |
| `start` | `number` | `1` | Where down the viewport the frame's top sits when the effect starts, as a fraction of the viewport height. |
| `end` | `number` | `0.3` | Where its bottom sits when the effect completes. Smaller is a longer scrub. |
| `progress` | `SharedValue<number>` | — | Drive the effect from a value of your own rather than from scroll. |
| `enabled` | `boolean` | `true` | Set false to render the image plainly. |
| `imageClassName` | `string` | — | Extra classes for the image itself, rather than the frame around it. |

### Example — The four effects

They are four different jobs. `parallax` drifts the image against the scroll so the frame reads as a window onto something further away; `zoom` settles it from slightly oversized to its natural size; `reveal` wipes it in from the bottom edge; `sequence` picks a frame out of a series, so the reader scrubs an animation with their thumb.

```tsx
<ScrollCanvas source={{ uri }} effect="parallax" />
<ScrollCanvas source={{ uri }} effect="zoom" />
<ScrollCanvas source={{ uri }} effect="reveal" />
<ScrollCanvas sources={frames} effect="sequence" />
```

### Notes

The frame clips, so the image can be oversized and moved without disturbing anything around it. `reveal` is a cover that retreats rather than a height that grows, because animating a height relayouts the image inside it every frame — and it is a wipe rather than a fade so the frame keeps its shape while it fills.

“Canvas” here is the frame the pictures move behind, not a drawing surface: nothing is rasterised and there is no `<canvas>` involved.

Under `useReducedMotion`, or with `enabled={false}`, the image renders plainly at rest.

---

Full page, with every example: https://panelui.dev/docs/components/scroll-canvas
