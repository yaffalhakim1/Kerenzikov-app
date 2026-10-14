# Table

Rows and columns that stay lined up, with sortable headers.

```tsx
import { Table } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Table } from '@/components/ui/table';
```

### Anatomy

```tsx
<Table.Frame>
  <Table.Header />
  <Table.Body />
</Table.Frame>

<Table>
  <Table.Header>
    <Table.Row>
      <Table.Head />
    </Table.Row>
  </Table.Header>
  <Table.Body>
    <Table.Row>
      <Table.Cell />
    </Table.Row>
  </Table.Body>
  <Table.Footer>
    <Table.Row>
      <Table.Cell />
    </Table.Row>
  </Table.Footer>
  <Table.Empty />
  <Table.Caption />
</Table>
```

### Variants

- **variant** — `default` *(default)*, `outline`
- **size** — `default` *(default)*, `sm`

### Parts

- `Table.Frame` — The table in a widget shell — column headings on the tray, rows in the card below. Takes the whole table and lifts the `Table.Header` out itself.
- `Table.Header` — The band of column headers. Draws the rule that separates it from the body.
- `Table.Body` — The data rows. Renders every child it is given — reach for a `FlatList` once the table is long.
- `Table.Footer` — Totals band, tinted and ruled off, because a sum is not another row of data.
- `Table.Row` — One row. Given `onPress` it becomes a button; `selected` keeps the chosen one lit.
- `Table.Head` — A column header. Given `onPress` it becomes the handle for sorting by that column.
- `Table.Cell` — One cell. Bare text is wrapped in the cell’s own type style; anything else is rendered as given.
- `Table.Caption` — A line about the table as a whole. Place it after the body — a caption read before the columns is a heading.
- `Table.Empty` — Stands in for the body when there is nothing to show, keeping the header that says what would be there.

### Props

#### `TableProps`

Extends `ViewProps, VariantProps<typeof tableVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `size` | `TableSize` | `default` | Row density. `Table.Row`, `Table.Head` and `Table.Cell` follow it, so it only needs setting here. |
| `striped` | `boolean` | `false` | Tint every other body row. Helps the eye track across a wide row; drop it for a short table, where the stripes are louder than the data. |
| `columns` | `TableColumn[]` | — | The column model: one entry per column, in order. Every `Table.Head` and `Table.Cell` takes its `flex`, `width` and `align` from the entry at its own position in the row, so a column is described once instead of on every row. Anything set on a head or a cell still wins. Declare it outside render — a new array each frame renumbers every cell. |
| `children` | `ReactNode` | — | — |

#### `TableHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `TableBodyProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `TableFooterProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `TableRowProps`

Extends `Omit<AnimatedPressableProps, 'children' \| 'disabled'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `selected` | `boolean` | — | Marks the row as the chosen one — for a table you pick from. |
| `disabled` | `boolean` | — | — |
| `index` | `number` | — | Position in the section, for a row rendered outside `Table.Body` — a `FlatList` item, say. Decides which rows a striped table tints. |
| `last` | `boolean` | — | Whether this is the section's final row, for a row rendered outside `Table.Body`. The last row drops its hairline so it does not double up with the table's own bottom edge. |
| `children` | `ReactNode` | — | — |

#### `TableHeadProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `flex` | `number` | — | Share of the leftover width, relative to the other cells in the row. Defaults to 1, so columns divide the row evenly. Without a `columns` model on the root it must match the `flex` on the cells beneath it. |
| `width` | `number` | — | Fixed width in pixels, for a column that must not move — an icon, a state dot. Without a `columns` model on the root it must match the `width` on the cells beneath it. |
| `align` | `CellAlign` | — | Which edge the column's content sits against. Use `end` for numbers: a money column reads as a column only when the digits line up. |
| `sortable` | `boolean` | — | Show the sort arrow without committing to a direction — the column can be sorted, but is not the one being sorted by. Implied by `sortDirection`. |
| `sortDirection` | `TableSortDirection` | — | The direction this column is currently sorted in. Turns the arrow over. |
| `onPress` | `AnimatedPressableProps['onPress']` | — | Called on a tap. Supplying it makes the header a button. |
| `labelClassName` | `string` | — | Styles the header's text. |
| `children` | `ReactNode` | — | — |

#### `TableCellProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `flex` | `number` | — | Share of the leftover width, relative to the other cells in the row. Defaults to 1. Without a `columns` model on the root it must match the `flex` on the head above it. |
| `width` | `number` | — | Fixed width in pixels, for a column that must not move. Without a `columns` model on the root it must match the `width` on the head above it. |
| `align` | `CellAlign` | — | Which edge the cell's content sits against. Without a `columns` model on the root, match the head above it. |
| `labelClassName` | `string` | — | Styles the cell's text. |
| `children` | `ReactNode` | — | — |

#### `TableCaptionProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `TableEmptyProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `TableFrameProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `ReactNode` | — | Caption on the tray, above the column headings. |
| `action` | `ReactNode` | — | Trailing slot on the title row — a button, a badge, a menu. |
| `description` | `ReactNode` | — | A line under the title, for what the table is counting. |
| `size` | `TableSize` | `default` | Row density, as on `Table`. |
| `striped` | `boolean` | `false` | Tint every other body row, as on `Table`. |
| `columns` | `TableColumn[]` | — | The column model, as on `Table`. |
| `children` | `ReactNode` | — | — |

### Example — Basic

Cells divide the row evenly unless told otherwise. `flex={2}` gives a column twice the share of the leftover width, and `align="end"` puts a money column’s digits against the same edge so they read as a column.

```tsx
<Table variant="outline">
  <Table.Header>
    <Table.Row>
      <Table.Head flex={2}>Invoice</Table.Head>
      <Table.Head>Method</Table.Head>
      <Table.Head align="end">Amount</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {invoices.map((invoice) => (
      <Table.Row key={invoice.id}>
        <Table.Cell flex={2}>{invoice.id}</Table.Cell>
        <Table.Cell>{invoice.method}</Table.Cell>
        <Table.Cell align="end">{invoice.amount}</Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
  <Table.Footer>
    <Table.Row>
      <Table.Cell flex={2} labelClassName="font-medium">Total</Table.Cell>
      <Table.Cell />
      <Table.Cell align="end" labelClassName="font-medium">$1,750.00</Table.Cell>
    </Table.Row>
  </Table.Footer>
</Table>
```

### Notes

### Columns are a convention, not a mechanism

There is no column model. A column exists because every row divides its width the same way, so `flex` and `width` on a `Table.Head` and on the `Table.Cell`s beneath it have to agree. `flex` is a share of the leftover width — the default of 1 makes columns even — and `width` pins a column that must not move, such as an icon or a state dot.

### Sorting is yours

The table renders a sort direction; it never sorts. `sortDirection` says which way the arrow points and `onPress` reports the tap — reordering the rows stays with you, because the data being reordered is yours and only you know whether that means a comparator, a refetch or a new query.

What the component does own is making the press land. The sorted column takes a full-strength arrow *and* a foreground label at a heavier weight, because one signal at the size of a sort arrow is too quiet: a press that only nudges a dim chevron reads as a press that did nothing, even when the rows behind it did move.

### Long tables

`Table.Body` renders every row it is given, so a table of thousands belongs in a `FlatList` instead. `Table.Row` takes `index` and `last` directly for that case: a virtualised row has no `Table.Body` above it to read its position from, and without them a striped table would tint nothing and every row would keep its hairline.

```tsx
<FlatList
  data={invoices}
  renderItem={({ item, index }) => (
    <Table.Row index={index} last={index === invoices.length - 1}>
      <Table.Cell flex={2}>{item.id}</Table.Cell>
      <Table.Cell align="end">{item.amount}</Table.Cell>
    </Table.Row>
  )}
/>
```

Wrap the list in a `Table` so the rows still read the density and striping, and put the header row above the list rather than inside it.

### Accessibility

The root, the bands, the rows and the cells carry `table`, `rowgroup`, `row`, `columnheader` and `cell` roles, so a screen reader walks the table as a table. A row given `onPress` is the exception: it announces itself as a button, because being able to act on it is the more useful fact about it.

`Table.Row` forwards ordinary view or Pressable props for the branch it renders, while retaining ownership of its row/selected/disabled semantics, row classes, and—when interactive—its button role and primary press handler.

---

Full page, with every example: https://panelui.dev/docs/components/table
