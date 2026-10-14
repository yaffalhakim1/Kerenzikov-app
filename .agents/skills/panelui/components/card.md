# Card

Content surface with header, body and footer.

```tsx
import { Card } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Card } from '@/components/ui/card';
```

### Anatomy

```tsx
<Card>
  <Card.Header>
    <Card.Title>…</Card.Title>
    <Card.Description>…</Card.Description>
  </Card.Header>
  <Card.Content>…</Card.Content>
  <Card.Footer>…</Card.Footer>
</Card>
```

### Variants

- **variant** — `plain` *(default)*, `panel`

### Parts

- `Card.Header` — Title and description block.
- `Card.Title` — Card heading.
- `Card.Description` — Muted supporting line.
- `Card.Content` — Main body.
- `Card.Footer` — Row of actions. `variant="panel"` draws it as a band set into the card instead — a rule across the top, a step darker, and the card's own bottom corners — for a footer that is what somebody does with the card rather than more of what it says.

### Props

#### `CardProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `CardFooterProps`

Extends `CardProps, VariantProps<typeof footerVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `Header` | `CardHeader,` | **required** | — |
| `Title` | `CardTitle,` | **required** | — |
| `Description` | `CardDescription,` | **required** | — |
| `Content` | `CardContent,` | **required** | — |
| `Footer` | `CardFooter,` | **required** | — |

### Example — Full anatomy

Header, content and footer carry the padding, so the card itself never needs a padding class.

```tsx
<Card>
  <Card.Header>
    <Card.Title>Monthly report</Card.Title>
    <Card.Description>Revenue and retention for October.</Card.Description>
  </Card.Header>
  <Card.Content>
    <Text size="3xl" weight="bold">$48,120</Text>
    <Text size="sm" muted>+12% on September</Text>
  </Card.Content>
  <Card.Footer>
    <Button variant="outline" size="sm">Export</Button>
    <Button size="sm">Open</Button>
  </Card.Footer>
</Card>
```

### Notes

### Padding lives on the slots

The root carries none, which is why a card whose media reaches its own corners needs nothing but `overflow-hidden` — no padding to undo first.

### Every part is a plain view

A card draws a surface and stops there. Nothing in it subscribes to a theme value, drives an animation or reaches for a native module, so a screen may render as many as it likes and pay for the views alone. A decorative backing layer is composed as the first child of a card that clips, not built in.

---

Full page, with every example: https://panelui.dev/docs/components/card
