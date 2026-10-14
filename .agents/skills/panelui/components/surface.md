# Surface

Elevated container with a variant ladder.

```tsx
import { Surface } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Surface } from '@/components/ui/surface';
```

### Usage

```tsx
<Surface>
  <Text weight="medium">Account</Text>

  <Surface variant="secondary" className="mt-3">
    <Text size="sm" muted>Signed in as khalid@example.com</Text>

    <Surface variant="tertiary" className="mt-3">
      <Text size="xs" muted>Session expires in 12 days</Text>
    </Surface>
  </Surface>
</Surface>
```

### Variants

- **variant** — `default` *(default)*, `secondary`, `tertiary`, `transparent`
- **padding** — `none`, `sm`, `default` *(default)*, `lg`
- **bordered** — `true`
- **elevated** — `true`

### Props

#### `SurfaceProps`

Extends `ViewProps, VariantProps<typeof surfaceVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `bordered` | `boolean` | — | A hairline border. A surface the same colour as what it sits on needs one to read as a distinct plane rather than dissolving into the background. |
| `elevated` | `boolean` | — | A soft shadow lifting the surface off the page. Off by default because a nested surface reads its depth from its fill, not from a shadow it would only cast onto its parent. |
| `padding` | `'none' \| 'sm' \| 'default' \| 'lg'` | `default` | Inner spacing. `none` is for a surface wrapping a bled image or a chart. |

### Example — Nested hierarchy

The variants form a ladder, not a palette: each step sits one level further from the background, so nesting them builds depth without naming a colour.

```tsx
<Surface>
  <Text weight="medium">Account</Text>
  <Surface variant="secondary" className="mt-3">
    <Text size="sm" muted>Signed in as khalid@example.com</Text>
    <Surface variant="tertiary" className="mt-3">
      <Text size="xs" muted>Session expires in 12 days</Text>
    </Surface>
  </Surface>
</Surface>
```

### Notes

`borderCurve: 'continuous'` is applied on iOS, giving Apple's squircle corner rather than a circular arc — visibly smoother at this radius. Android ignores it.

Use `variant="transparent"` when you want the padding and radius without a fill.

---

Full page, with every example: https://panelui.dev/docs/components/surface
