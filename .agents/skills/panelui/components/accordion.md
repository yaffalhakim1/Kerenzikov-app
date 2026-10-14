# Accordion

Collapsible sections with single or multiple selection.

```tsx
import { Accordion } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Accordion } from '@/components/ui/accordion';
```

### Anatomy

```tsx
<Accordion>
  <Accordion.Item value="…">
    <Accordion.Trigger>
      <Accordion.Title>…</Accordion.Title>
      <Accordion.Indicator />
    </Accordion.Trigger>
    <Accordion.Content>…</Accordion.Content>
  </Accordion.Item>
</Accordion>
```

### Variants

- **variant** — `default` *(default)*, `surface`, `separated`, `bordered`, `ghost`

### Parts

- `Accordion.Item` — One collapsible section. Its `value` identifies it in the accordion's state.
- `Accordion.Trigger` — The pressable header row. A bare string child is wrapped in the title style. Standard Pressable props are forwarded; a supplied `onPress` runs before the accordion toggles the item.
- `Accordion.Title` — Heading text inside the trigger.
- `Accordion.Indicator` — Chevron that rotates 180° while the item is open.
- `Accordion.Content` — The collapsible body. Unmounts when closed, unless `keepMounted` keeps it mounted and hidden from layout instead.

### Props

#### `AccordionProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `variant` | `AccordionVariant` | `default` | — |
| `selectionMode` | `AccordionSelectionMode` | `single` | `single` collapses the open item when another opens. |
| `value` | `string \| string[]` | — | Expanded item value(s), controlled. |
| `defaultValue` | `string \| string[]` | — | — |
| `onValueChange` | `(value: string \| string[]) => void` | — | — |
| `hideSeparator` | `boolean` | `false` | Hide the hairlines drawn between items. |
| `keepMounted` | `boolean` | `false` | Keep every body mounted while its section is closed, so state inside it — a part-filled form, a scroll position, a running animation — survives being collapsed. Costs the render of every section up front; set it per section on `Accordion.Content` instead when only one of them needs it. |
| `children` | `ReactNode` | — | — |

#### `AccordionItemProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `string` | **required** | Identifies this item in the accordion's value. |
| `isDisabled` | `boolean` | — | — |
| `children` | `ReactNode` | — | — |

#### `AccordionTriggerProps`

Extends `Omit<PressableProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `AccordionIndicatorProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | Replaces the default chevron. |

#### `AccordionContentProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `keepMounted` | `boolean` | `false` | Stay mounted while closed instead of unmounting, so state inside the body survives the section being collapsed. Overrides the accordion's own setting, either way round. |
| `children` | `ReactNode` | — | — |

### Example — Single open section

The default. Opening one section closes the others — use it when the panels are alternatives rather than a checklist.

```tsx
<Accordion defaultValue="shipping">
  <Accordion.Item value="shipping">
    <Accordion.Trigger>
      <Accordion.Title>Shipping</Accordion.Title>
      <Accordion.Indicator />
    </Accordion.Trigger>
    <Accordion.Content>
      <Text size="sm" muted>Free over $50. Arrives in 2–4 days.</Text>
    </Accordion.Content>
  </Accordion.Item>

  <Accordion.Item value="returns">
    <Accordion.Trigger>
      <Accordion.Title>Returns</Accordion.Title>
      <Accordion.Indicator />
    </Accordion.Trigger>
    <Accordion.Content>
      <Text size="sm" muted>30 days, unopened, receipt required.</Text>
    </Accordion.Content>
  </Accordion.Item>
</Accordion>
```

### Notes

Pass an array to `value` / `defaultValue` with `selectionMode="multiple"`. `onValueChange` hands back whatever shape you gave it — a string in single mode, an array in multiple.

`keepMounted` trades the cost of rendering every closed body up front for keeping what is inside them alive. Set it on the accordion for all of them, or on a single `Accordion.Content` for the one section that needs it — the prop on the content wins either way round.

**With the operating system set to reduce motion the section arrives at its new height and the chevron at its new angle without travelling to either.** The disclosure is the point and it still happens; the movement is what goes.

---

Full page, with every example: https://panelui.dev/docs/components/accordion
