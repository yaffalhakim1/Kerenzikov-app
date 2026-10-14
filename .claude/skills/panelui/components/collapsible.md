# Collapsible

One section of content, shown and hidden by its own header.

```tsx
import { Collapsible } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Collapsible } from '@/components/ui/collapsible';
```

### Anatomy

```tsx
<Collapsible>
  <Collapsible.Trigger>
    <Collapsible.Title>…</Collapsible.Title>
    <Collapsible.Indicator />
  </Collapsible.Trigger>
  <Collapsible.Content>…</Collapsible.Content>
</Collapsible>
```

### Variants

- **variant** — `default` *(default)*, `surface`, `ghost`

### Parts

- `Collapsible.Trigger` — The pressable header row. A bare string child is wrapped in the title style. Its Pressable props are forwarded, and a supplied onPress runs before the disclosure toggles.
- `Collapsible.Title` — Heading text inside the trigger.
- `Collapsible.Indicator` — Chevron that rotates 180° while the body is open.
- `Collapsible.Content` — The body. Its height animates open and closed, and it stays mounted throughout.

### Props

#### `CollapsibleProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `variant` | `CollapsibleVariant` | `default` | — |
| `open` | `boolean` | — | Whether the body is showing, controlled. |
| `defaultOpen` | `boolean` | `false` | — |
| `onOpenChange` | `(open: boolean) => void` | — | — |
| `isDisabled` | `boolean` | `false` | Stops the trigger opening or closing it, and marks it disabled to a screen reader. |
| `children` | `ReactNode` | — | — |

#### `CollapsibleTriggerProps`

Extends `Omit<PressableProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `CollapsibleIndicatorProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | Replaces the default chevron. |

#### `CollapsibleContentProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

### Example — A section of optional detail

The default: a header row, a chevron, and a body that opens under it.

```tsx
<Collapsible>
  <Collapsible.Trigger>
    <Collapsible.Title>What is included</Collapsible.Title>
    <Collapsible.Indicator />
  </Collapsible.Trigger>
  <Collapsible.Content>
    <Text size="sm" muted>
      Unlimited projects, 100GB of storage, and email support.
    </Text>
  </Collapsible.Content>
</Collapsible>
```

### Notes

Leave `open` off and the component tracks its own state from `defaultOpen`. Pass `open` and it follows that instead, and `onOpenChange` is where the press arrives.

`isDisabled` stops the trigger opening or closing it and marks it disabled to a screen reader. It does not close a section that is already open — a disabled control is one that cannot be used, not one that undoes itself.

A closed body is taken out of the accessibility tree as well as hidden, so a screen reader does not read out a section that is not on screen.

**With the operating system set to reduce motion the panel snaps between its two states and the chevron turns without travelling.** The disclosure still happens; it is the movement that is dropped.

---

Full page, with every example: https://panelui.dev/docs/components/collapsible
