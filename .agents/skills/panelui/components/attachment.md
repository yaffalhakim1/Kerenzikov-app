# Attachment

File row with upload states, built on Item.

```tsx
import { Attachment } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Attachment } from '@/components/ui/attachment';
```

### Usage

```tsx
<Attachment state="uploading">
  <Attachment.Media>
    <FileIcon />
  </Attachment.Media>
  <Attachment.Content>
    <Attachment.Title>report.pdf</Attachment.Title>
    <Attachment.Description>PDF · 2.4 MB</Attachment.Description>
  </Attachment.Content>
  <Attachment.Actions>
    <Attachment.Action accessibilityLabel="Remove report.pdf">
      <XIcon size={16} />
    </Attachment.Action>
  </Attachment.Actions>
</Attachment>
```

### Parts

- `Attachment.Group` — A row or column of attachments — the stack Item.Group provides.
- `Attachment.Media` — Leading slot: a file-type icon tile, or an image thumbnail.
- `Attachment.Content` — The name-and-description column.
- `Attachment.Title` — The file name. Shimmers while uploading or processing.
- `Attachment.Description` — File type, size or status. Tints destructive on error.
- `Attachment.Actions` — Trailing slot for the action buttons.
- `Attachment.Action` — One icon button — remove, retry, download. Its label is required.

### Props

#### `AttachmentProps`

Extends `Omit<AnimatedPressableProps, 'children' \| 'disabled'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `state` | `AttachmentState` | — | Where the file is in its life. `uploading`/`processing` shimmer the name; `error` tints the row destructive. Default `done`. |
| `size` | `AttachmentSize` | — | Row density, passed through to the underlying Item. |
| `orientation` | `'horizontal' \| 'vertical'` | — | Stack the row into a card — for a horizontal group of thumbnails. |
| `progress` | `number` | — | Upload progress 0–1. Draws a thin bar along the bottom while busy. |
| `disabled` | `boolean` | — | — |
| `children` | `ReactNode` | — | — |

#### `AttachmentGroupProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `orientation` | `'horizontal' \| 'vertical'` | — | — |
| `children` | `ReactNode` | — | — |

#### `AttachmentMediaProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `variant` | `'default' \| 'icon' \| 'image'` | — | `icon` frames it in a tile; `image` clips it for a thumbnail. |
| `children` | `ReactNode` | — | — |

#### `AttachmentContentProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `AttachmentTitleProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `AttachmentDescriptionProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `AttachmentActionsProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `AttachmentActionProps`

Extends `Omit<AnimatedPressableProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `accessibilityLabel` | `string` | **required** | — |
| `children` | `ReactNode` | — | — |

### Example — A finished file

The default state is `done`. It is an Item underneath, so the media, sizing and pressable behaviour are the ones you already know.

```tsx
<Attachment>
  <Attachment.Media>
    <FileIcon size={18} />
  </Attachment.Media>
  <Attachment.Content>
    <Attachment.Title>sales-dashboard.pdf</Attachment.Title>
    <Attachment.Description>PDF · 2.4 MB</Attachment.Description>
  </Attachment.Content>
  <Attachment.Actions>
    <Attachment.Action accessibilityLabel="Remove sales-dashboard.pdf">
      <XIcon size={16} />
    </Attachment.Action>
  </Attachment.Actions>
</Attachment>
```

### Notes

Attachment is a thin layer over **Item** — every part maps to an Item part, so `size`, `orientation` and the pressable behaviour are Item's, documented there. What Attachment owns is `state`: the shimmer on the title while busy, the destructive tint on error, and the progress bar.

**An icon action needs a label.** `Attachment.Action` requires `accessibilityLabel` — an X on its own tells a screen reader nothing about what it removes.

---

Full page, with every example: https://panelui.dev/docs/components/attachment
