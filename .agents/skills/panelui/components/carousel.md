# Carousel

A run of slides, one at a time, dragged with a finger.

```tsx
import { Carousel } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Carousel } from '@/components/ui/carousel';
```

### Anatomy

```tsx
<Carousel>
  <Carousel.Content>
    <Carousel.Item>
      <Carousel.Caption>…</Carousel.Caption>
    </Carousel.Item>
  </Carousel.Content>
  <Carousel.Controls>
    <Carousel.Previous />
    <Carousel.Dots />
    <Carousel.Next />
  </Carousel.Controls>
</Carousel>
```

### Parts

- `Carousel.Content` — The box the slides live in. Give it a height — nothing inside it is in the layout flow, so it has no height of its own to take. Its alignment is the resting place every slide is offset from.
- `Carousel.Item` — One slide. It reads its own position from the run and takes whatever transform the root's `variant` asks for.
- `Carousel.Caption` — A label shown only while its slide is the active one. It lives inside the slide so it travels with what it names.
- `Carousel.Dots` — One dot per slide, the active one drawn as a bar. Length rather than colour alone carries the position. `orientation="vertical"` runs them down an edge.
- `Carousel.Previous` — Step back. Goes dim and stops responding at the start of a run that does not loop.
- `Carousel.Next` — Step forward. Goes dim and stops responding at the end of a run that does not loop.
- `Carousel.Controls` — The arrows and the dots in one pill, for sitting over the content rather than taking a strip of the layout.

### Props

#### `CarouselProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `variant` | `CarouselVariant` | `default` | How the slides are arranged, and how they move. |
| `orientation` | `CarouselOrientation` | `horizontal` | Which way the run travels. `stack` is always dealt sideways. |
| `loop` | `boolean` | `false` | Run past the last slide back to the first, and the other way. |
| `align` | `CarouselAlign` | `center` | Where the active slide sits. `center` is what the fanned layouts want; `start` suits a row of cards running off the trailing edge. `coverflow` and `stack` are always centred. |
| `itemSize` | `number` | — | Length of one slide along the direction of travel, in points. Measured from the carousel's own box when omitted, which is what a full-width slide wants; set it for a run that shows more than one at a time. |
| `autoplay` | `boolean` | `false` | Advance on a timer. Stops at the non-looping end or after the first touch. |
| `autoplayInterval` | `number` | `4000` | Milliseconds each slide is held when `autoplay` is set. |
| `index` | `number` | — | Controlled active slide. Requests move visually only after this value changes; an index invalidated by a child-count change is normalized and reported. |
| `defaultIndex` | `number` | `0` | Starting slide when uncontrolled. |
| `onIndexChange` | `(index: number) => void` | — | — |
| `scrollEnabled` | `boolean` | `true` | Let go of the gesture, for a carousel inside something else that drags. |
| `children` | `ReactNode` | — | — |

#### `CarouselContentProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `CarouselItemProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `CarouselCaptionProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `CarouselDotsProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `orientation` | `CarouselOrientation` | `horizontal` | Lay the dots down the side instead of across. |
| `interactive` | `boolean` | `true` | Jump to a slide by tapping its dot. |

#### `CarouselArrowProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `CarouselControlsProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

### Example — A track

The plain layout, and the honest choice for content that is read rather than admired. `loop` runs past the last slide back to the first.

```tsx
<Carousel loop>
  <Carousel.Content className="h-56">
    {scenes.map((scene) => (
      <Carousel.Item key={scene.title} className="px-2">
        <Image source={{ uri: scene.uri }} className="h-full w-full rounded-2xl" />
      </Carousel.Item>
    ))}
  </Carousel.Content>
  <Carousel.Controls className="mt-4" />
</Carousel>
```

### Notes

**One value drives all four layouts.** The position in the run is a fractional index on the UI thread, and each slide styles itself from its distance to it — so `default` and `coverflow` are the same component with different arithmetic rather than two different trees.

**Give `Carousel.Content` a height.** Every slide is absolutely positioned, so nothing inside it is in the layout flow and it has no height of its own to take.

**`itemSize` is the length along the direction of travel.** It defaults to the carousel's own box, which is what a full-width slide wants. Set it smaller for a run that shows more than one slide at a time, and for `interactive`, where the overlap is the effect.

**Depth is faked, deliberately.** React Native's transform has `perspective` and `rotateY` but no `translateZ`, so a slide in `coverflow` is made to look further away with scale, opacity and z-order rather than actually being moved back.

**A short flick and a long drag both move one slide.** Either passing a fraction of a slide or exceeding a velocity counts as a move, and the step is measured from the slide the drag started on — rounding the current position would let a slow drag that never reached the threshold still count.

**Autoplay does not resume.** The first touch ends it for the session.

**`stack` is always dealt sideways**, whatever `orientation` says. A deck has no track to travel along.

**In the piled layouts, only the top slide takes touches.** `zIndex` reorders what is drawn but not, on iOS, what is hit — hit testing walks subviews in the order they were added, so without this the last slide rendered would sit in front of every gesture regardless of its z-order. In a deck that slide is the one at the bottom of the pile, drawn at zero opacity.

**The middle slide rests at exactly 1.** In `interactive` the fan's depth comes from the others shrinking rather than from the active one growing, because text is rasterised at its layout size and then scaled — a caption on a slide held above 1 is drawn at the wrong raster size for the whole time it is readable. `Carousel.Caption` fades but never scales, for the same reason: inside the slide, the two would compound.

`Carousel.Previous` and `Carousel.Next` forward ordinary view props, but keep ownership of their navigation handler, button name, and boundary-disabled state so caller props cannot turn a visible arrow into a different action.

Controlled and uncontrolled requests share the same owner-driven lifecycle: a controlled gesture reports through `onIndexChange` but renders the accepted `index` until its owner updates; an uncontrolled gesture commits locally. Requests for the already accepted index are no-ops, external controlled resets do not emit change callbacks, and leaving controlled mode retains the last accepted index instead of restoring a stale default.

---

Full page, with every example: https://panelui.dev/docs/components/carousel
