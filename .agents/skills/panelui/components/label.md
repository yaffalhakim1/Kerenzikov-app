# Label

Form field label with required, invalid and disabled states.

```tsx
import { Label } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Label } from '@/components/ui/label';
```

### Anatomy

```tsx
<Label>
  <Label.Text>…</Label.Text>
</Label>
```

### Parts

- `Label.Text` — The label text. Renders the required asterisk when the label is required.

### Props

#### `LabelProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `isRequired` | `boolean` | `false` | Appends an asterisk marking the field as required. |
| `isInvalid` | `boolean` | `false` | Recolours the label to signal a validation error. |
| `isDisabled` | `boolean` | `false` | — |
| `children` | `ReactNode` | — | — |

#### `LabelTextProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `asteriskClassName` | `string` | — | Classes for the required asterisk. |

### Example — Marking a field required

`isRequired` adds the asterisk and the accessibility state.

```tsx
<View className="gap-1.5">
  <Label isRequired>Email</Label>
  <Input keyboardType="email-address" />
</View>
```

---

Full page, with every example: https://panelui.dev/docs/components/label
