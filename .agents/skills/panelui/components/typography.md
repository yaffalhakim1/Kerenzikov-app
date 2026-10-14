# Typography

Semantic text presets.

```tsx
import { Typography } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Typography } from '@/components/ui/typography';
```

### Anatomy

```tsx
<Typography type="h1">…</Typography>

<Typography.Heading type="h2">…</Typography.Heading>
<Typography.Paragraph>…</Typography.Paragraph>
<Typography.Code>…</Typography.Code>
<Typography.Blockquote>…</Typography.Blockquote>

<Typography.List>
  <Typography.ListItem>…</Typography.ListItem>
</Typography.List>
```

### Variants

- **type** — `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `lead`, `body` *(default)*, `body-sm`, `body-xs`, `large`, `small`, `blockquote`, `code`
- **weight** — `normal`, `medium`, `semibold`, `bold`
- **align** — `start`, `end`, `left`, `center`, `right`
- **transform** — `uppercase`, `lowercase`, `capitalize`
- **underline** — `true`
- **italic** — `true`
- **strike** — `true`
- **muted** — `true`

### Parts

- `Typography.Heading` — Heading text, wired up with the matching accessibility heading level.
- `Typography.Paragraph` — Body copy, at any of the body presets.
- `Typography.Code` — Inline code on a muted surface.
- `Typography.Blockquote` — A quotation, marked by a rule down its leading edge.
- `Typography.List` — A bulleted or numbered list. Draws the markers React Native does not have.
- `Typography.ListItem` — One line of a list. The marker beside it belongs to the list.

### Props

#### `TypographyProps`

Extends `Omit<TextProps, 'size' \| 'weight'>, VariantProps<typeof typographyVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `weight` | `TypographyWeight` | — | Overrides the weight the preset sets. This is the one to reach for when a paragraph needs a bolded run and a heading would be wrong. |
| `underline` | `boolean` | — | Underlines the text — a link, a defined term, a signature line. |
| `italic` | `boolean` | — | Slants the text. |
| `strike` | `boolean` | — | Strikes the text through: an old price, a completed task. |
| `align` | `'left' \| 'center' \| 'right'` | — | Horizontal alignment within whatever the text is laid out in. |
| `transform` | `'uppercase' \| 'lowercase' \| 'capitalize'` | — | Case, applied for display without changing the string underneath. |

#### `TypographyHeadingProps`

Extends `Omit<TypographyProps, 'type'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `type` | `HeadingType` | `body` | — |

#### `TypographyParagraphProps`

Extends `Omit<TypographyProps, 'type'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `type` | `ParagraphType` | `body` | — |

#### `TypographyCodeProps`

Extends `Omit<TypographyProps, 'type'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `containerClassName` | `string` | — | Classes for the surface behind the code text. |

#### `TypographyBlockquoteProps`

Extends `Omit<TypographyProps, 'type'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `containerClassName` | `string` | — | Classes for the row that carries the rule. |

#### `TypographyListProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `ordered` | `boolean` | — | Numbered rather than bulleted. The numbers are drawn, not counted by CSS. |
| `children` | `ReactNode` | — | — |

#### `TypographyListItemProps`

Extends `Omit<TypographyProps, 'type'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `type` | `ParagraphType` | `body` | — |

### Example — Headings and body

The type scale in one place, so headings stay consistent instead of being rebuilt from size and weight classes. `lead` is the sentence under a heading; `large` and `small` are the two steps either side of body.

```tsx
<Typography.Heading type="h1">Ship it</Typography.Heading>

<Typography.Paragraph type="lead">
  Everything you need to build a screen, and nothing you have to style twice.
</Typography.Paragraph>

<Typography.Paragraph>
  Body copy at the default size.
</Typography.Paragraph>

<Typography.Paragraph type="small" muted>
  Updated 3 minutes ago
</Typography.Paragraph>
```

### Notes

`weight`, `align`, `transform` and the marks apply to every preset and to every part — a heading, a list item and a blockquote all take them.

`Typography.List` draws its own markers because React Native has none. It reads its children to number them, so an ordered list counts correctly however the items were generated, and the marker is a view rather than the `•` character — that character's size and baseline shift with the platform font, and a view does not.

---

Full page, with every example: https://panelui.dev/docs/components/typography
