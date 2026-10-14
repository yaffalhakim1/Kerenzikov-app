# GridItem

Bento tiles, and the grid that places them.

```tsx
import { GridItem } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { GridItem } from '@/components/ui/grid-item';
```

### Anatomy

```tsx
<GridItem.Group columns={2} gap={12}>
  <GridItem colSpan={2} rowSpan={1}>
    <GridItem.Background />   {/* the layer behind, clipped by the tile */}
    <GridItem.Media />        {/* an icon tile, a thumbnail, an avatar */}
    <GridItem.Title />        {/* what the tile is of */}
    <GridItem.Value />        {/* the figure */}
    <GridItem.Description />
    <GridItem.Footer>        {/* pinned to the bottom edge */}
      <GridItem.Actions />
    </GridItem.Footer>
  </GridItem>
</GridItem.Group>
```

### Variants

- **variant** — `default` *(default)*, `outline`, `muted`, `plain`
- **size** — `default` *(default)*, `sm`
- **disabled** — `true`

### Parts

- `GridItem.Group` — The grid. Owns `columns`, `gap`, the cell shape and the density, measures its own width, places every tile, and stands as tall as the rows they needed.
- `GridItem.Background` — The layer behind the tile's content — a chart, a gradient, an image, an oversized icon. Absolutely filling the tile and taking no touches, so it can be written anywhere among the children. It is the one part meant to be cropped: the tile clips it.
- `GridItem.Media` — Leading slot: an icon tile, a thumbnail, or an avatar passed through. Sized off the group's density.
- `GridItem.Title` — What the tile is of. Deliberately quiet, because the value under it is the message.
- `GridItem.Value` — The figure. The largest thing on the tile, and the reason it is there.
- `GridItem.Description` — One muted line — a period, a comparison, a caveat.
- `GridItem.Footer` — A strip pushed to the bottom of the tile with the space left over, rather than positioned there. A tile's height is fixed by its cells, so there is always space to push with.
- `GridItem.Actions` — Trailing slot: buttons, a chip, a chevron.

### Props

#### `GridItemGroupProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `columns` | `number` | `2` | How many tracks wide the grid is. |
| `gap` | `number` | `12` | Gutter between tiles, in points — both ways. |
| `aspect` | `number` | `1` | The shape of one cell, as width ÷ height. `1` is square; below one the cells are taller than they are wide. Ignored when `rowHeight` is given. |
| `rowHeight` | `number` | — | Cell height in points, when the grid should not be driven by its width. |
| `size` | `GridItemSize` | `default` | Density for every tile in the grid. Set here rather than on each one. |
| `children` | `ReactNode` | — | — |

#### `GridItemProps`

Extends `Omit<AnimatedPressableProps, 'children' \| 'disabled'>, Omit<VariantProps<typeof gridItemVariants>, 'disabled' \| 'size'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `disabled` | `boolean` | — | — |
| `colSpan` | `number` | — | How many tracks wide the tile is. Clamped to the group's column count, so a tile asking for three columns of a two-column grid is two wide rather than overflowing it. Read by `GridItem.Group`, which does the placing — a tile does not size itself, because a tile that sized itself would not be in a grid. |
| `rowSpan` | `number` | — | How many rows tall it is. Also read by the group. |
| `children` | `ReactNode` | — | — |

#### `GridItemBackgroundProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `GridItemMediaProps`

Extends `ViewProps, VariantProps<typeof mediaVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `GridItemTitleProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `GridItemValueProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `GridItemDescriptionProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `GridItemFooterProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `GridItemActionsProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

### Example — Columns, gaps and the shape of a cell

`columns` is how many tracks wide the grid is and `gap` is the gutter, in points, both ways. The cell's height comes from `aspect` — width ÷ height, so `1` is square and anything above it is a letterbox. Give `rowHeight` instead when the grid should be a fixed size rather than driven by the width it was handed.

Everything is set on the group, never on a tile: a tile that sized itself would not be in a grid.

```tsx
{/* Two square-ish tracks. */}
<GridItem.Group columns={2} gap={12} aspect={1.6}>…</GridItem.Group>

{/* Three narrow ones, at the smaller density. */}
<GridItem.Group columns={3} gap={10} size="sm">…</GridItem.Group>

{/* Cells of a fixed height, whatever the width. */}
<GridItem.Group columns={2} gap={12} rowHeight={120}>…</GridItem.Group>
```

### Notes

### A tile's height is its cells, not its content

This is the trade the grid makes, and it is the right way round for a bento: a grid of boxes that each grew to fit their own text is not a grid. But it does mean content taller than its cell is clipped rather than pushing the tile down.

So set the cell from what the tallest tile has to hold, not from the shape that looked right. At the default density a tile carrying a media tile, a title, a value and a line under it needs about 164 points, and one carrying a title, a value and a footer about 130 — `rowHeight` says so directly, where `aspect` says it only once you know how wide a track came out. Then `numberOfLines` on the text, `size="sm"`, or another row for anything still over.

### It draws nothing until it has measured

Every tile is placed from the group's width, so there is one frame of an empty box before the grid appears — which is better than one frame of every tile piled on the origin. The group reserves its height as soon as it knows it, so nothing below it jumps.

### Reading order is writing order

Tiles are placed row by row in the order they are written, and that is also the order they sit in the tree — so a screen reader walks them the same way the eye does. Reordering the visual grid means reordering the children, which is the only way the two can be guaranteed to agree.

### When to use Item instead

If every entry is the same size and the list runs down the screen, it is a list, and [Item](/docs/components/item) is the shape for it — one that stacks, separates and grows with its content. Reach for a grid when the sizes are *deliberately* different, because that difference is the only thing a bento says that a list does not.

GridItem forwards ordinary view or Pressable props for the branch it renders, while retaining ownership of its disabled announcement, tile classes, and—when interactive—its button role and primary press handler.

---

Full page, with every example: https://panelui.dev/docs/components/grid-item
