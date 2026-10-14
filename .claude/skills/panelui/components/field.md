# Field

Layout and validation-state kit a form control composes into.

```tsx
import { Field } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Field } from '@/components/ui/field';
```

### Anatomy

```tsx
<Field>
  <Field.Label>…</Field.Label>
  <Field.Description>…</Field.Description>
  <Field.Error>…</Field.Error>
</Field>

<Field.Set>
  <Field.Legend>…</Field.Legend>
  <Field>…</Field>
</Field.Set>

<Field.Group>
  <Field>…</Field>
  <Field.Separator>Or</Field.Separator>
  <Field>…</Field>
</Field.Group>
```

### Variants

- **orientation** — `vertical` *(default)*, `horizontal`
- **disabled** — `true`
- **legendVariant** — `legend`, `label`

### Parts

- `Field.Content` — Inner column for a label and description sitting beside a control, in a horizontal `Field`.
- `Field.Label` — A `Label` that reads `isRequired`/`isInvalid`/`isDisabled` from the enclosing `Field` when not set explicitly.
- `Field.Description` — Helper text under the control.
- `Field.Error` — One validation message, or several — pass `errors` for an array; it dedupes by message and lists more than one with bullets. Announced with `role="alert"`.
- `Field.Set` — Groups related fields, e.g. a block of checkboxes for one setting.
- `Field.Legend` — Heading for a `Field.Set`.
- `Field.Group` — Vertical rhythm container for stacking `Field`/`Field.Set` blocks in a form.
- `Field.Separator` — A rule, with an optional centered label — `Or`, between two sign-in options.
- `Field.Title` — Non-label heading text, for a custom card-style row.

### Props

#### `FieldProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `orientation` | `'vertical' \| 'horizontal'` | `vertical` | `horizontal` puts a label beside the control instead of above it. |
| `invalid` | `boolean` | `false` | Marks every `Field.Label`/`Field.Description` below as invalid. |
| `disabled` | `boolean` | `false` | — |
| `required` | `boolean` | `false` | Marks every `Field.Label` below as required, same as `Label`'s own prop. |
| `children` | `ReactNode` | — | — |

#### `FieldContentProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `FieldLabelProps`

Extends `LabelProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `FieldErrorProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `errors` | `Array<string \| { message?: string } \| null \| undefined>` | — | Error messages to render, deduplicated by message. A single entry renders as plain text; more than one renders as a bulleted list, since RN has no `<ul>`. Prefer this over `children` when the messages come from a form's validation state, which is naturally an array. |
| `children` | `ReactNode` | — | — |

#### `FieldSetProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `FieldLegendProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `variant` | `'legend' \| 'label'` | — | `legend` reads as a section heading; `label` sits closer to a field label. |

#### `FieldGroupProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `FieldSeparatorProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | Centered text, e.g. "Or" — omit for a plain rule. |

#### `FieldTitleProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

### Example — Grouped checkboxes

`Field.Legend` names the group; each `Checkbox` keeps its own label.

```tsx
<Field.Set>
  <Field.Legend>Notifications</Field.Legend>
  <Checkbox checked={email} onCheckedChange={setEmail} label="Email" />
  <Checkbox checked={sms} onCheckedChange={setSms} label="SMS" />
  <Checkbox checked={push} onCheckedChange={setPush} label="Push" />
</Field.Set>
```

### Notes

### When you don't need it

`Input`, `Checkbox`, `Switch` and `RadioGroup` already carry their own `label`, `description` and error slot — for a single one of those, skip `Field` and pass the props straight through:

```tsx
<Input label="Email" description="We'll never share it." errorMessage={error} />
```

Reach for `Field` when a row doesn't fit that shape. See [Form](/docs/form/form) for wiring one up to real validation state.

---

Full page, with every example: https://panelui.dev/docs/components/field
