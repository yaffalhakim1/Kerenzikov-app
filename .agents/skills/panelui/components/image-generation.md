# ImageGeneration

The place an image will be, while it is being made.

```tsx
import { ImageGeneration } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { ImageGeneration } from '@/components/ui/image-generation';
```

### Anatomy

```tsx
<ImageGeneration status={status}>
  {/* the finished image, once there is one */}
</ImageGeneration>

{/* Or the field on its own, in a box of your own. */}
<ImageGeneration.Field />
```

### Variants

- **size** — `compact` *(default)*, `fluid`
- **error** — `true`

### Parts

- `ImageGeneration.Field` — The dot field on its own, for a placeholder that is not an image. It fills its parent, so give it a box.

### Props

#### `ImageGenerationFieldProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `paused` | `boolean` | `false` | Holds the light still, at one representative frame. |
| `animation` | `DotFieldAnimation` | `drift` | How the light moves through the field. `drift` wanders around the middle; `pulse` is a ring leaving the centre; `scan` crosses as a band. All three cost the same. |

#### `ImageGenerationProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `status` | `ImageGenerationStatus` | `generating` | How far the generation has got. Defaults to `generating`. |
| `label` | `string` | — | What the box is, for a screen reader. Defaults to the status text, with the prompt after it where there is one. |
| `prompt` | `string` | — | The instruction the image was made from. Shown under the status. |
| `resolution` | `string` | `1024 × 1024` | Shown in the corner of the frame. Pass an empty string to drop it. |
| `aspectRatio` | `number` | `1` | The box's shape, as width over height. Defaults to `1` — square, which is what most models return, and what the frame must be before there is an image to measure. |
| `size` | `'compact' \| 'fluid'` | `compact` | `compact` caps the width at a thumbnail and centres it; `fluid` fills. |
| `animation` | `DotFieldAnimation` | `drift` | How the light behind the dots moves while there is work outstanding. `drift` wanders, `pulse` leaves the centre as a ring, `scan` crosses as a band. All three cost the same. |
| `statusText` | `string` | — | Replaces the sentence under the frame. |
| `showStatus` | `boolean` | `true` | Hides the status line, leaving the frame and the prompt. |
| `onRetry` | `() => void` | — | Shown as a button under an `error`. Without it there is no button. |
| `frameClassName` | `string` | — | Extra classes for the frame — its radius, ground and aspect. |
| `mediaClassName` | `string` | — | Extra classes for the layer the image sits in. |
| `statusClassName` | `string` | — | Extra classes for the status line. |
| `children` | `ReactNode` | — | The finished image. Anything that fills its parent — an `Image`, a video. |

### Example — Through the work

The common path. The box is the right shape from the first frame, so nothing below it moves when the image lands.

```tsx
const [status, setStatus] = useState<ImageGenerationStatus>('queued');

<ImageGeneration
  status={status}
  prompt="a quiet mountain landscape at sunset"
  resolution="1024 × 1024"
>
  <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
</ImageGeneration>
```

### Notes

### The five steps

`status` moves the picture through the work rather than switching it.

| | The field | The image |
| --- | --- | --- |
| `queued` | Full | Not shown |
| `generating` | Full | Not shown |
| `refining` | Half | Coming through |
| `complete` | Gone | Full |
| `error` | Gone | Dimmed |

`refining` is the overlap, and it is the step worth having. An image that appears the instant the field vanishes has been swapped in; one that surfaces through it has been developed. Skip straight from `generating` to `complete` if your model gives you nothing to show in between, but pass through `refining` if it does.

### The light, and what it costs

A region of light drifts around the middle of the box. A dot near it is brighter, larger, and pushed a little away from its centre — that displacement is what makes the light read as something passing over the grid rather than as the grid changing colour. The falloff is a smoothstep, so the light has no rim for the eye to find.

Every dot at its own opacity would be one drawing each, and a field this size has hundreds. They are banded into five opacity levels instead, one path per level, so the whole field is five native updates a frame rather than five hundred — and at a dot radius of one point the steps between levels are not visible.

A box big enough to want more than nine hundred dots gets the same picture drawn coarser rather than a thousand more circles rebuilt every frame.

### Reduced motion

The band stops and the field is drawn at one still frame of itself. A placeholder showing nothing is indistinguishable from a component that failed to load, so this is a quieter picture rather than an empty one.

### The image itself

`children` is whatever fills the frame — an `Image`, a video, a canvas. Give it `width: '100%'` and `height: '100%'`; the frame is already the right shape, and a child that sizes itself will not match it.

The fade is opacity and a small settle in scale. There is no blur ramp: React Native has no equivalent that runs on the UI thread, and reaching for a blur package would make an optional dependency load-bearing for the look of a placeholder.

### Announcing it

The frame carries `busy` while there is work outstanding, so a screen reader says the box is not the answer yet, and the status line is a live region. The image itself is hidden from the reader until it has arrived — there is nothing to describe before then.

---

Full page, with every example: https://panelui.dev/docs/ai-components/image-generation
