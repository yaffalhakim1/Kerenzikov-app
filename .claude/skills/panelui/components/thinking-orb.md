# ThinkingOrb

Dotted orb saying which kind of busy an agent is.

```tsx
import { ThinkingOrb } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { ThinkingOrb } from '@/components/ui/thinking-orb';
```

### Usage

```tsx
<ThinkingOrb state="searching" />

// The small tuning, for a line of text.
<ThinkingOrb state="working" size={20} />
```

### Props

#### `ThinkingOrbProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `state` | `ThinkingOrbState` | `working` | Which of the six animations to show. |
| `size` | `number` | `64` | Side of the orb in pixels. Two tunings ship, and they are separate designs rather than one scaled: at or below 32 the orb switches to far fewer, proportionally much larger dots moving faster, because a faithful lattice at that size is grey mush. |
| `speed` | `number` | `1` | Multiplier on the state's own speed. |
| `paused` | `boolean` | `false` | Freeze on the current frame. |
| `color` | `string` | — | Ink colour. Defaults to the theme's foreground, so the orb inverts with it. |
| `accessibilityLabel` | `string` | — | Overrides the per-state default announced to screen readers. |

### Example — The six states

Pick the one that matches what is actually happening. The states are not interchangeable decoration — the whole reason to use this instead of a spinner is that the shape in motion tells the reader something, and a `solving` orb over a network request is a lie.

```tsx
<ThinkingOrb state="working" />     {/* running a task */}
<ThinkingOrb state="searching" />   {/* looking something up */}
<ThinkingOrb state="solving" />     {/* working a problem out */}
<ThinkingOrb state="listening" />   {/* taking input */}
<ThinkingOrb state="composing" />   {/* writing a reply */}
<ThinkingOrb state="shaping" />     {/* forming a structure */}
```

### Notes

### How it is drawn

The geometry is honestly three-dimensional — points on a sphere, rotated and tilted, projected orthographically, with depth carried by dot size and ink weight. React Native has no 2D canvas to paint that into, and one animated SVG node per dot would be two hundred native prop writes a frame, which no amount of tuning survives.

So the dots are quantised into eight ink levels and each level is emitted as a *single* path of circle arcs. Eight animated props a frame whatever the dot count, and depth ordering comes free — depth is what drives the ink in the first place, so painting faint to strong paints far to near. Everything from the trigonometry to the path strings runs in one worklet on the UI thread; React renders once and then never again.

### Size is two designs, not a scale

Two tunings ship. At or below 32px the orb uses far fewer, proportionally much larger dots moving faster, because the motion has to read at a size where the individual dots barely do. Sizes in between are scaled from the nearer tuning; the dot radii scale sub-linearly, which is what keeps a small orb from becoming a smudge and a large one from becoming beads.

### Motion and accessibility

`role="img"` with a per-state label out of the box; `accessibilityLabel` overrides it with something more specific — “Analysing the repository…” beats “Searching”. Under `prefers-reduced-motion` the orb renders one representative frame and stops, which is why a paused orb still shows a shape.

---

Full page, with every example: https://panelui.dev/docs/ai-components/thinking-orb
