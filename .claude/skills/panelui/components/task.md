# Task

One step an agent took, and what it did while it was there.

```tsx
import { Task } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Task } from '@/components/ui/task';
```

### Usage

```tsx
<Task status="running">
  <Task.Trigger title="Searching the codebase" />
  <Task.Content>
    <Task.Item>
      Read <Task.File>calendar/index.tsx</Task.File>
    </Task.Item>
  </Task.Content>
</Task>
```

### Variants

- **status** — `pending`, `running`, `complete` *(default)*, `error`

### Parts

- `Task.Trigger` — The step. Shimmers its title while the status is `running`, and folds the body away.
- `Task.Content` — What the step did, indented behind a rule so the lines read as belonging to the step above them.
- `Task.Item` — One line of that.
- `Task.File` — A filename inside a line, drawn as a bordered chip — a path in the middle of a sentence is otherwise indistinguishable from the sentence.

### Props

#### `TaskProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `status` | `TaskStatus` | `complete` | Where the step has got to. Drives the leading glyph, and puts a shimmer on the title while it is `running`. |
| `open` | `boolean` | — | Controlled open state. |
| `defaultOpen` | `boolean` | `true` | Initial state when uncontrolled. Open — the steps are the record. |
| `onOpenChange` | `(open: boolean) => void` | — | — |
| `children` | `ReactNode` | — | — |

#### `TaskTriggerProps`

Extends `Omit<PressableProps, 'children' \| 'style'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | What the step is. Shimmers while the status is `running`. |
| `icon` | `ReactNode` | — | Leading glyph. Derived from `status` when not given. |
| `children` | `ReactNode` | — | Replaces the whole row. |

#### `TaskContentProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `TaskItemProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `TaskFileProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `icon` | `ReactNode` | — | A glyph for the file's kind, drawn before the name. |
| `children` | `ReactNode` | — | — |

### Example — A step and its detail

`status` is the whole state: it picks the glyph, tints the title on an error, and puts a shimmer on the title while the step is running.

```tsx
<Task status="complete">
  <Task.Trigger title="Read 4 files" />
  <Task.Content>
    <Task.Item>
      Opened <Task.File>calendar/index.tsx</Task.File>
    </Task.Item>
    <Task.Item>
      Opened <Task.File>date-picker/index.tsx</Task.File>
    </Task.Item>
  </Task.Content>
</Task>
```

### Notes

**It stays open.** A reasoning trace folds itself away because it stops being interesting once the answer starts; a task does not, because the steps are the record. Pass `defaultOpen={false}` for a step whose detail is noise — a pending one, usually.

**The body is indented behind a rule, not merely padded.** The rule is what says the lines belong to the step above them rather than being the next few steps, which matters the moment there is more than one task in a row.

**`Task.File` is bordered on purpose.** A path in the middle of a sentence set only in monospace still reads as part of the sentence, and the paths are the part of a task line anyone actually scans for.

**Nothing here depends on the AI SDK.** `status` is a string union that happens to line up with a tool part's `state`.

---

Full page, with every example: https://panelui.dev/docs/ai-components/task
