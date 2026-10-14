# Reasoning

The model's working, shown while it happens and folded away after.

```tsx
import { Reasoning } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Reasoning } from '@/components/ui/reasoning';
```

### Usage

```tsx
<Reasoning isStreaming={isStreaming}>
  <Reasoning.Trigger />
  <Reasoning.Content>{trace}</Reasoning.Content>
</Reasoning>
```

### Parts

- `Reasoning.Trigger` — The row that says how long it thought, and folds the trace away. Shimmers while streaming; pass `label` to put your own words to both states.
- `Reasoning.Content` — The trace. Collapses to nothing rather than unmounting, because it is usually still growing while it is folded.

### Props

#### `ReasoningProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `isStreaming` | `boolean` | `false` | Whether the trace is still arriving. Drives the shimmer on the trigger, opens the panel on the way in and closes it a beat after it goes false. |
| `duration` | `number` | — | How long the trace took, in seconds. Measured from the first streaming frame when it is not given, which is the number worth showing — it is what the reader actually waited. |
| `open` | `boolean` | — | Controlled open state. |
| `defaultOpen` | `boolean` | — | Initial state when uncontrolled. Defaults to whether it is streaming, so a live trace is open and a finished one arrives folded. Passing `false` explicitly also opts out of the auto-open. |
| `onOpenChange` | `(open: boolean) => void` | — | — |
| `children` | `ReactNode` | — | — |

#### `ReasoningTriggerProps`

Extends `Omit<PressableProps, 'children' \| 'style'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `label` | `(isStreaming: boolean, duration?: number) => ReactNode` | — | What the row says. Given the streaming state and the measured duration, so a caller can put its own words to both without reimplementing the timing. |
| `children` | `ReactNode` | — | Replaces the whole row, icon and chevron included. |

#### `ReasoningContentProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | The trace. A string is wrapped for you; anything else is left alone. |

### Example — A live trace

`isStreaming` is the only thing that has to be driven. The panel opens on the way in, the duration is measured across it, and it folds itself away about a second after the trace stops.

```tsx
<Reasoning isStreaming={status === 'streaming'}>
  <Reasoning.Trigger />
  <Reasoning.Content>{trace}</Reasoning.Content>
</Reasoning>
```

### Notes

**It closes once.** The auto-close is latched, so reopening a finished trace by hand sticks. Without the latch the same effect would fold it away a second later, and the panel would refuse to stay open for the one reader who wanted to read it.

**The duration is measured, not declared.** `duration` is optional; left off, the component times the wall clock between the first streaming frame and the last. That is the number worth showing — it is what the reader actually waited, rather than what the provider reports.

**The body collapses rather than unmounting.** A trace is usually still growing while it is folded, and a body that remounted on every open would restart every animation inside it and drop whatever had been scrolled to.

**Nothing here depends on the AI SDK.** The props are plain — a boolean, a string, a number — and they line up with what `message.parts` gives you. See [AI](/docs/ai) for the whole loop.

---

Full page, with every example: https://panelui.dev/docs/ai-components/reasoning
