# Alert

Status message with a built-in icon.

```tsx
import { Alert } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Alert } from '@/components/ui/alert';
```

### Anatomy

```tsx
<Alert>
  <Alert.Indicator />
  <Alert.Content>
    <Alert.Title>…</Alert.Title>
    <Alert.Description>…</Alert.Description>
  </Alert.Content>
</Alert>
```

### Variants

- **variant** — `default` *(default)*, `info`, `success`, `warning`, `destructive`

### Parts

- `Alert.Indicator` — Leading status icon, picked from the variant. Pass children to override it.
- `Alert.Content` — Flex-1 wrapper for the title and description.
- `Alert.Title` — Heading, coloured by the variant.
- `Alert.Description` — Body text, always muted.

### Props

#### `AlertProps`

Extends `ViewProps, VariantProps<typeof alertVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `icon` | `ReactNode` | — | Leading element rendered before the content. **Deprecated.** Prefer `<Alert.Indicator>`, which picks a status icon for you. Still honoured so v0.2 call sites keep rendering. |
| `children` | `ReactNode` | — | — |

#### `AlertIndicatorProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `iconProps` | `{ size?: number; color?: string }` | — | Overrides the size/colour of the default status icon. |
| `children` | `ReactNode` | — | Replaces the default status icon entirely. |

### Example — With a title and description

The indicator picks its icon from the variant, so most alerts need no `icon` prop.

```tsx
<Alert variant="warning">
  <Alert.Indicator />
  <Alert.Content>
    <Alert.Title>Card expiring</Alert.Title>
    <Alert.Description>
      Your card ending 4242 expires next month.
    </Alert.Description>
  </Alert.Content>
</Alert>
```

### Notes

Omit `Alert.Indicator` for a text-only alert. The legacy `icon` prop still renders, but prefer the indicator.

---

Full page, with every example: https://panelui.dev/docs/components/alert
