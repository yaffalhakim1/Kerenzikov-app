# Breadcrumb

The trail of links back up the hierarchy to the current page.

```tsx
import { Breadcrumb } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Breadcrumb } from '@/components/ui/breadcrumb';
```

### Anatomy

```tsx
<Breadcrumb>
  <Breadcrumb.List>
    <Breadcrumb.Item>
      <Breadcrumb.Link>…</Breadcrumb.Link>
    </Breadcrumb.Item>
    <Breadcrumb.Item>
      <Breadcrumb.Page>…</Breadcrumb.Page>
    </Breadcrumb.Item>
  </Breadcrumb.List>
</Breadcrumb>
```

### Variants

- **size** — `sm`, `default` *(default)*

### Parts

- `Breadcrumb.List` — The crumb row. Owns the separators — one between every pair of crumbs, none at the ends — and the collapsing, so you only ever list items.
- `Breadcrumb.Item` — One crumb: wraps a link or the current page.
- `Breadcrumb.Link` — A navigable crumb — an ancestor to jump back to. Muted until pressed, and carries the link role.
- `Breadcrumb.Page` — The trailing crumb: where you are now. Not a link, marked `aria-current="page"`, painted in full foreground so the trail resolves to it.
- `Breadcrumb.Separator` — The glyph between crumbs. `List` inserts it for you and hides it from screen readers; public only for a hand-assembled trail.
- `Breadcrumb.Ellipsis` — Stands in for the crumbs a collapsed trail hides. Static by default; give the list an `onEllipsisPress` and it becomes the trigger for a menu of the hidden steps.

### Props

#### `BreadcrumbProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `size` | `BreadcrumbSize` | `default` | Text density for every crumb. `sm` for a dense header bar. |
| `separator` | `ReactNode` | — | The glyph `Breadcrumb.List` places between crumbs. Defaults to a chevron; pass a `<Text>/</Text>`, a slash, or any node to change every gap at once. |
| `children` | `ReactNode` | — | — |

#### `BreadcrumbListProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `maxItems` | `number` | — | Collapse the trail once it holds more than this many crumbs, so a deep path never wraps into a block of text on a narrow screen. The first `itemsBeforeCollapse` and last `itemsAfterCollapse` survive; the middle folds into a single ellipsis. |
| `itemsBeforeCollapse` | `number` | `1` | How many leading crumbs to keep when collapsing. Default 1. |
| `itemsAfterCollapse` | `number` | `1` | How many trailing crumbs to keep when collapsing. Default 1. |
| `onEllipsisPress` | `() => void` | — | Makes the collapsed ellipsis pressable — the handle for a menu listing the hidden steps. Without it the ellipsis is a static marker. |
| `children` | `ReactNode` | — | — |

#### `BreadcrumbItemProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `BreadcrumbLinkProps`

Extends `Omit<AnimatedPressableProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `textClassName` | `string` | — | Text style for the crumb's label. |
| `children` | `ReactNode` | — | — |

#### `BreadcrumbPageProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `BreadcrumbSeparatorProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | Override the glyph for this one gap. Falls back to the root's separator. |

#### `BreadcrumbEllipsisProps`

Extends `Omit<AnimatedPressableProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

### Example — A trail

Links back up the tree, then the current page. The chevrons between them are the list's doing, not yours.

```tsx
<Breadcrumb>
  <Breadcrumb.List>
    <Breadcrumb.Item>
      <Breadcrumb.Link onPress={() => {}}>Home</Breadcrumb.Link>
    </Breadcrumb.Item>
    <Breadcrumb.Item>
      <Breadcrumb.Link onPress={() => {}}>Components</Breadcrumb.Link>
    </Breadcrumb.Item>
    <Breadcrumb.Item>
      <Breadcrumb.Page>Breadcrumb</Breadcrumb.Page>
    </Breadcrumb.Item>
  </Breadcrumb.List>
</Breadcrumb>
```

### Notes

You never write separators — `Breadcrumb.List` inserts a chevron between each crumb. Change the glyph for the whole trail with `separator` on the root, or for one gap by passing children to a hand-placed `Breadcrumb.Separator`.

A deep trail on a narrow phone should not wrap into a paragraph. Give the list a `maxItems` and it keeps the first `itemsBeforeCollapse` and last `itemsAfterCollapse` crumbs (both default to 1), folding the middle into a single ellipsis. Hand the list an `onEllipsisPress` and the ellipsis becomes the handle for a menu of the hidden steps.

`Breadcrumb.Ellipsis` forwards view props even while static. When it becomes interactive, it still retains ownership of the Show more button name, press feedback, primary handler, and compact classes.

---

Full page, with every example: https://panelui.dev/docs/components/breadcrumb
