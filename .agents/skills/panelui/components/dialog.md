# Dialog

Modal dialog with a backdrop and footer actions.

```tsx
import { Dialog } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Dialog } from '@/components/ui/dialog';
```

### Anatomy

```tsx
<Dialog>
  <Dialog.Trigger>…</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Title>…</Dialog.Title>
    <Dialog.Description>…</Dialog.Description>
    <Dialog.Footer>
      <Dialog.Close>…</Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog>
```

### Variants

- **variant** — `plain` *(default)*, `panel`

### Parts

- `Dialog.Trigger` — Clones its child and opens the dialog on press.
- `Dialog.Content` — The dialog surface, rendered in a portal.
- `Dialog.Title` — Required for accessibility.
- `Dialog.Description` — Supporting text.
- `Dialog.Footer` — Row of actions, aligned to the trailing edge. `variant="panel"` draws it as a band instead — a rule across the top, a step darker, and the dialog's own bottom corners, bleeding out through the dialog's padding to reach its edges.
- `Dialog.Close` — Clones its child and closes the dialog on press.

### Props

#### `DialogProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | **required** | — |
| `open` | `boolean` | — | Controlled open state. |
| `onOpenChange` | `(open: boolean) => void` | — | — |
| `defaultOpen` | `boolean` | — | Initial state when uncontrolled. |

#### `DialogContentProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `dismissible` | `boolean` | `true` | Tap on the backdrop closes the dialog. Default true. |
| `blur` | `boolean` | `false` | Frost the screen behind the dialog instead of dimming it. Uses `expo-blur` when installed and falls back to the dim when it is not, so it is safe to pass either way. Someone who has Reduce Transparency switched on gets an opaque backdrop instead, which is the whole point of the setting. |
| `children` | `ReactNode` | — | — |

#### `DialogFooterProps`

Extends `ViewProps, VariantProps<typeof dialogFooterVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

### Example — Uncontrolled, with a trigger

```tsx
<Dialog>
  <Dialog.Trigger>
    <Button variant="outline">Rename</Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Title>Rename project</Dialog.Title>
    <Dialog.Description>This is visible to everyone on the team.</Dialog.Description>
    <Input className="mt-4" defaultValue={project.name} />
    <Dialog.Footer>
      <Dialog.Close>
        <Button variant="ghost">Cancel</Button>
      </Dialog.Close>
      <Button onPress={save}>Save</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog>
```

### Notes

### Focus after closing

On the web, closing returns keyboard focus to the element that had it before the overlay opened. Nested overlays return to the still-open parent first. If that element was removed or disabled while the overlay was open, it is skipped rather than focusing a stale control. Native screen-reader containment remains the platform's `accessibilityViewIsModal` behaviour.

---

Full page, with every example: https://panelui.dev/docs/components/dialog
