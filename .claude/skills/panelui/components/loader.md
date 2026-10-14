# Loader

Nine loading animations behind one variant prop.

```tsx
import { Loader } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Loader } from '@/components/ui/loader';
```

### Usage

```tsx
<Loader variant="wave-physics" />
```

### Props

#### `LoaderProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `LoaderVariant` | `pulse-dots` | Which animation to draw. They are interchangeable — pick one for the character it gives the screen and keep it. |
| `size` | `LoaderSize` | `md` | Overall scale. The geometry of every variant is multiplied by it. |
| `color` | `string` | — | Ink. Takes a theme token by name — `"--color-primary"` — as readily as a literal, and the token is usually what you want: a literal cannot follow the theme into dark mode. With neither, the loader draws in the readable foreground of the surface it is on, so one inside a filled button is legible without being told. |
| `speed` | `number` | `1` | Multiplier on the tempo. `1` is the designed speed; `2` is twice as fast. |
| `label` | `string` | `Loading` | What a screen reader announces. Defaults to "Loading". Say what is loading when the loader is the only thing on the screen. |
| `className` | `string` | — | — |

### Example — Choosing a variant

Nine of them. The dot and bar variants are the quiet ones, for a loader sitting inside something else; `liquid-dots`, `morph-ring` and `wave-physics` have more character, and earn their place on a screen that is otherwise empty.

```tsx
<Loader variant="pulse-dots" />      {/* the default */}
<Loader variant="bounce-dots" />
<Loader variant="pulsating-dots" />
<Loader variant="liquid-dots" />
<Loader variant="bar-cascade" />
<Loader variant="bouncing-bars" />
<Loader variant="symmetric-wave" />
<Loader variant="morph-ring" />
<Loader variant="wave-physics" />
```

### Notes

### Choosing one

The three dot variants and the three bar variants are quiet enough to sit inside something else — a button, a row, a card header. `liquid-dots`, `morph-ring` and `wave-physics` have more character and want a screen that is otherwise empty; used in a button they draw attention to the wait rather than away from it.

Whichever you pick, pick one. A loader is part of an app’s voice, and an app that uses a different one on every screen reads as several apps.

### How they are drawn

Anything with a small, fixed number of moving pieces is a view per piece with its own animated style: three dots is three transforms a frame, which is cheaper than rebuilding a path string.

Anything whose count is high, or whose shape is derived rather than declared, is a single SVG path rebuilt on the UI thread. `wave-physics` is fifteen bars responding to a bouncing ball — one animated prop drawn that way, fifteen drawn the other, and the fifteen would not stay in step with each other for free.

`liquid-dots` is the odd one. The merge where the two blobs meet is normally a blur-and-threshold filter pass, and SVG filters do not render on native at all — so the two circles and the neck between them are three subpaths of one path, unioned by the non-zero fill rule. It costs one animated prop a frame and gives a crisper edge than a threshold does.

### Reduced motion

Every variant draws a representative still frame rather than freezing wherever it happened to be. A stopped animation should look like a shape someone drew, not like a bug caught mid-cycle — so the dots hold an uneven set of opacities, the bars hold the shape of their wave, and the ball rests at the top of a hop.

`speed={0}` does the same thing deliberately, for a loader that should be present but still.

---

Full page, with every example: https://panelui.dev/docs/components/loader
