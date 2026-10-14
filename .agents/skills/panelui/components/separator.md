# Separator

Horizontal or vertical rule between content, optionally labelled.

```tsx
import { Separator } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Separator } from '@/components/ui/separator';
```

### Usage

```tsx
<Separator />

{/* Vertical, inside a row that gives it a height. */}
<View className="h-5 flex-row items-center">
  <Text size="sm">Components</Text>
  <Separator orientation="vertical" className="mx-3" />
  <Text size="sm">Themes</Text>
</View>
```

### Variants

- **orientation** — `horizontal` *(default)*, `vertical`
- **variant** — `thin` *(default)*, `thick`

### Props

#### `SeparatorProps`

Extends `ViewProps, VariantProps<typeof separatorVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `thickness` | `number` | — | Thickness in pixels, overriding the variant. Sets the height of a horizontal separator and the width of a vertical one. |
| `decorative` | `boolean` | `true` | Whether the separator is only visual. A decorative separator is skipped by screen readers; set false when the split itself carries meaning — between two groups of menu items, say — and it is announced instead. A labelled separator is never decorative: its label is content, so it is always read. |
| `children` | `ReactNode` | — | Optional label sitting in the break of a horizontal rule — the "or" between two sign-in paths. A bare string is wrapped in the muted label style; an element is rendered as-is. Ignored on the vertical axis, where a label is not a divider. |
| `labelClassName` | `string` | — | Styles the label text of a labelled separator. |

### Example — Between sections

The common pair: a horizontal rule splitting a card, and vertical rules between inline links.

```tsx
<Surface variant="secondary" className="px-6 py-7">
  <Text weight="medium">PanelUI</Text>
  <Text size="sm" muted>A React Native component library.</Text>

  <Separator className="my-4" />

  <View className="h-5 flex-row items-center">
    <Text size="sm">Components</Text>
    <Separator orientation="vertical" className="mx-3" />
    <Text size="sm">Themes</Text>
    <Separator orientation="vertical" className="mx-3" />
    <Text size="sm">Examples</Text>
  </View>
</Surface>
```

### Notes

A horizontal separator fills its parent's width; a vertical one fills its parent's height. The vertical case is the one that catches people out — inside a `flex-row` the row has no intrinsic height, so pair it with `items-stretch` on the row or an explicit `h-*` somewhere.

`thickness` wins over `variant`. Both set the height of a horizontal separator and the width of a vertical one, so the same value reads the same either way round.

Pass children to make a labelled separator: the rule splits around the content, so a divider can carry an "or" without a second element. Only the horizontal axis takes a label — a stacked word is not a divider, so a vertical separator ignores its children.

---

Full page, with every example: https://panelui.dev/docs/components/separator
