# Shimmer

Animated highlight sweeping across content.

```tsx
import { Shimmer } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Shimmer } from '@/components/ui/shimmer';
```

### Usage

```tsx
<Shimmer>Thinking…</Shimmer>

<Shimmer duration={1400} textClassName="text-lg font-medium">
  Generating response…
</Shimmer>

// Mask arbitrary content instead of a string.
<Shimmer as="view" className="w-full gap-2">
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-full" />
</Shimmer>
```

### Props

#### `ShimmerProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `as` | `'text' \| 'view'` | `text` | `text` renders `children` as a single styled string and masks the sweep to the glyphs. `view` masks the sweep to whatever subtree you pass. |
| `duration` | `number` | `2000` | Milliseconds for one sweep. |
| `spread` | `number` | `2` | Width of the highlight band, as a multiple of the content width. |
| `baseColor` | `string` | — | Colour of the content at rest. Defaults to the theme's muted foreground. |
| `shimmerColor` | `string` | — | Colour at the centre of the sweep. Defaults to the theme's foreground. |
| `mode` | `'loop' \| 'ping-pong'` | `loop` | `loop` restarts from the left; `ping-pong` reverses on each pass. |
| `once` | `boolean` | `false` | Sweep once instead of repeating. |
| `reverse` | `boolean` | `false` | Sweep right-to-left. |
| `enabled` | `boolean` | `true` | Set false to render the content statically without animating. |
| `textClassName` | `string` | — | Extra classes for the text when `as="text"`. |
| `textStyle` | `StyleProp<TextStyle>` | — | Extra styles for the text when `as="text"`. |
| `color` | `string` | — | **Deprecated.** Use `shimmerColor`. |
| `intensity` | `number` | — | Peak opacity of the highlight. **Deprecated.** Set `shimmerColor` to a colour with the alpha you want. |
| `children` | `ReactNode` | — | — |

### Example — A thinking indicator

The default. The sweep is clipped to the glyphs, so the letters catch the light instead of sitting under a passing band.

```tsx
<Shimmer>Thinking…</Shimmer>

<Shimmer duration={1400} textClassName="text-lg font-medium">
  Generating response…
</Shimmer>
```

### Notes

The sweep runs entirely on the UI thread and never re-renders React while animating.

It stops when the OS reduce-motion setting is on, and when `enabled` is false — in both cases the content renders statically in `baseColor`.

`baseColor` and `shimmerColor` default to the theme's muted-foreground and foreground tokens, so the effect reads correctly on any surface without configuration. `color` and `intensity` still work but are deprecated in favour of the two colour props.

---

Full page, with every example: https://panelui.dev/docs/ai-components/shimmer
