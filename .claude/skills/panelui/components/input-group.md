# InputGroup

Input with leading and trailing decorators.

```tsx
import { InputGroup } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { InputGroup } from '@/components/ui/input-group';
```

### Anatomy

```tsx
<InputGroup>
  <InputGroup.Prefix>…</InputGroup.Prefix>
  <InputGroup.Input />
  <InputGroup.Suffix>…</InputGroup.Suffix>
</InputGroup>
```

### Parts

- `InputGroup.Prefix` — Leading decorator, absolutely positioned.
- `InputGroup.Input` — The field itself. Accepts all `Input` props.
- `InputGroup.Suffix` — Trailing decorator, absolutely positioned.

### Props

#### `InputGroupProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `isDisabled` | `boolean` | — | Disables the input and dims both decorators. |
| `children` | `ReactNode` | — | — |

#### `InputGroupDecoratorProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `isDecorative` | `boolean` | — | Marks the decorator as presentation-only: touches fall through to the Input and screen readers skip it. Leave it off when the decorator holds something interactive, such as a show-password toggle. |
| `children` | `ReactNode` | — | — |

### Example — A prefix and a suffix

The decorators are measured, and the field is padded around them — so text never runs underneath.

```tsx
<InputGroup>
  <InputGroup.Prefix>
    <Text muted>https://</Text>
  </InputGroup.Prefix>
  <InputGroup.Input placeholder="yoursite.com" />
  <InputGroup.Suffix>
    <Text muted>.dev</Text>
  </InputGroup.Suffix>
</InputGroup>
```

### Notes

Set `isDecorative` when the decorator is presentation-only: touches fall through to the input and screen readers skip it. Leave it off when it holds something interactive, like a show-password toggle. Prefix and Suffix measurements are removed automatically when decorators unmount, so conditionally rendered adornments do not leave stale input padding.

---

Full page, with every example: https://panelui.dev/docs/components/input-group
