# Marker

Inline note between conversation turns.

```tsx
import { Marker } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Marker } from '@/components/ui/marker';
```

### Usage

```tsx
<Marker>
  <Marker.Icon>
    <CheckIcon size={14} />
  </Marker.Icon>
  <Marker.Content>Explored 4 files</Marker.Content>
</Marker>
```

### Variants

- **variant** — `default` *(default)*, `border`, `separator`
- **disabled** — `true`

### Parts

- `Marker.Icon` — Decorative leading slot. Hidden from screen readers, and tinted to the muted foreground.
- `Marker.Content` — The line of text. Takes `shimmer` while the step is still running.

### Props

#### `MarkerProps`

Extends `Omit<AnimatedPressableProps, 'children' \| 'disabled'>, Omit<VariantProps<typeof markerVariants>, 'disabled'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `disabled` | `boolean` | — | — |
| `variant` | `MarkerVariant` | `default` | `default` is the inline status row. `border` closes it with a hairline. `separator` centres the content between two rules — the "Yesterday" divider shape. |
| `children` | `ReactNode` | — | — |

#### `MarkerIconProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `MarkerContentProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `shimmer` | `boolean` | — | Sweep a highlight through the text, for a step that is still running. Drop it when the step finishes — a marker that shimmers forever reads as a stuck one. |
| `children` | `ReactNode` | — | — |

### Example — Status rows

The common case: a short line of what just happened, one row per step.

```tsx
<Marker>
  <Marker.Icon><SearchIcon size={14} /></Marker.Icon>
  <Marker.Content>Explored 4 files</Marker.Content>
</Marker>

<Marker>
  <Marker.Icon><CheckIcon size={14} /></Marker.Icon>
  <Marker.Content>Applied 2 edits to invoice.ts</Marker.Content>
</Marker>
```

### Notes

A marker with no `onPress` renders as a plain view and is not announced as a button — the same rule `Item` follows. Give it an `onPress` and it becomes a pressable with the press feedback every other pressable in the library has.

`Marker.Icon` is hidden from screen readers. It repeats what the content already says, and announcing both is noise. It also picks up the muted foreground automatically, so an icon dropped inside needs no `color`.

The `separator` variant draws its rules with `Separator`, so they follow the same token and thickness as every other rule in the app.

Marker forwards ordinary view or Pressable props according to the rendered branch, but keeps ownership of its disabled announcement, styled surface, and—when interactive—its button role and primary press handler.

---

Full page, with every example: https://panelui.dev/docs/components/marker
