# EmptyState

Placeholder for a list or screen with no content.

```tsx
import { EmptyState } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { EmptyState } from '@/components/ui/empty-state';
```

### Anatomy

```tsx
<EmptyState>
  <EmptyState.Header>
    <EmptyState.Media>…</EmptyState.Media>
    <EmptyState.Title>…</EmptyState.Title>
    <EmptyState.Description>…</EmptyState.Description>
  </EmptyState.Header>
  <EmptyState.Content>…</EmptyState.Content>
</EmptyState>
```

### Variants

- **variant** — `default` *(default)*, `card`
- **size** — `sm`, `default` *(default)*, `lg`

### Parts

- `EmptyState.Header` — Groups media, title and description into one centred column.
- `EmptyState.Media` — Visual anchor above the title.
- `EmptyState.Title` — Heading.
- `EmptyState.Description` — Supporting text.
- `EmptyState.Content` — Slot below the header, for actions.

### Props

#### `EmptyStateProps`

Extends `ViewProps, VariantProps<typeof emptyStateVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `variant` | `'default' \| 'card'` | `default` | `default` fills its parent — a whole screen, or a flex slot. `card` is a self-contained bordered block for an empty state that sits inside content rather than owning the screen. |
| `size` | `EmptyStateSize` | `default` | Scales the padding, media, title and description together. |
| `children` | `ReactNode` | — | — |

#### `EmptyStateMediaProps`

Extends `ViewProps, VariantProps<typeof mediaVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

### Example — With an icon and an action

The icon media fans two ghost cards behind the icon; the content slot below the header holds a primary action.

```tsx
<EmptyState>
  <EmptyState.Header>
    <EmptyState.Media variant="icon">
      <SearchIcon size={18} />
    </EmptyState.Media>
    <EmptyState.Title>No results found</EmptyState.Title>
    <EmptyState.Description>Try adjusting your search or filters.</EmptyState.Description>
  </EmptyState.Header>
  <EmptyState.Content>
    <Button variant="outline" fullWidth>Clear filters</Button>
  </EmptyState.Content>
</EmptyState>
```

---

Full page, with every example: https://panelui.dev/docs/components/empty-state
