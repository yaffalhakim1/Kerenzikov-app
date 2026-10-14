# Message

Chat turn with avatar, bubble, header and footer.

```tsx
import { Message } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Message } from '@/components/ui/message';
```

### Anatomy

```tsx
<Message.Group>
  <Message align="start">
    <Message.Avatar>…</Message.Avatar>
    <Message.Content>
      <Message.Header>…</Message.Header>
      <Message.Bubble>
        <Message.BubbleContent>…</Message.BubbleContent>
      </Message.Bubble>
      <Message.Actions>…</Message.Actions>
      <Message.Footer>…</Message.Footer>
    </Message.Content>
  </Message>
</Message.Group>
```

### Variants

- **align** — `start` *(default)*, `end`

### Parts

- `Message.Group` — Consecutive turns from one sender. Tightens spacing and stacks them.
- `Message.Avatar` — Slot for the sender avatar. Reserved but emptied on a stacked message.
- `Message.Content` — Column holding the header, bubble, actions and footer.
- `Message.Header` — Sender name or timestamp above the bubble.
- `Message.Bubble` — The speech bubble. Takes its colour and squared corner from align.
- `Message.BubbleContent` — Text inside the bubble, in whichever colour reads against it.
- `Message.Footer` — Delivery state or timestamp below the bubble.
- `Message.Actions` — Row of controls under the bubble — copy, retry, feedback.

### Props

#### `MessageProps`

Extends `ViewProps, VariantProps<typeof messageVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `align` | `Align` | `start` | Which side of the conversation this turn belongs to. `end` is the outgoing side — the person holding the device. |
| `stacked` | `boolean` | — | Continuation of the message above it: tighter spacing, and the avatar slot is reserved but left empty so bubbles stay aligned. `Message.Group` sets this for you. |
| `onLongPress` | `(event: GestureResponderEvent) => void` | — | Fires on a long press anywhere on the turn — the gesture a chat uses to surface per-message actions (copy, reply, react). Open a menu from it; the component only exposes the press. When set, the whole row gains press feedback. A plain tap should still do nothing, so there is no `onPress`. |
| `children` | `ReactNode` | — | — |

#### `MessageGroupProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `align` | `Align` | `start` | Alignment applied to every Message inside that does not set its own. |
| `children` | `ReactNode` | — | — |

#### `MessageAvatarProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `MessageContentProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `MessageHeaderProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `MessageBubbleProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `MessageBubbleContentProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `MessageFooterProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `MessageActionsProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

### Example — Both sides of a conversation

`align` decides the row direction, the avatar side, which bubble corner is squared off, and the bubble colour — every part reads it from context.

```tsx
<Message>
  <Message.Avatar>
    <Avatar size="sm" source={{ uri: them.avatar }} fallback="OL" />
  </Message.Avatar>
  <Message.Content>
    <Message.Bubble>
      <Message.BubbleContent>How can I help you today?</Message.BubbleContent>
    </Message.Bubble>
  </Message.Content>
</Message>

<Message align="end">
  <Message.Content>
    <Message.Bubble>
      <Message.BubbleContent>Set a reminder for 9am.</Message.BubbleContent>
    </Message.Bubble>
    <Message.Footer>Read</Message.Footer>
  </Message.Content>
</Message>
```

### Notes

### Alignment

`align` is the only decision the root makes, and every part reads it from context: which side the row sits on, which way the avatar goes, which corner of the bubble is squared off, and which colour it takes. `start` is incoming (muted bubble), `end` is outgoing (primary bubble).

Set it on `Message.Group` instead and every message inside inherits it.

### Grouping

`Message.Group` marks every turn after the first as `stacked`. A stacked message still renders its avatar slot but leaves it empty, so the bubbles stay in one column instead of the second sliding under the first one's avatar. Pass `stacked` on a message explicitly to override that.

### In a list

Render a transcript with an inverted `FlatList`, not a `ScrollView` — it keeps the newest turn pinned to the bottom without measuring content, and recycles rows as the conversation grows.

---

Full page, with every example: https://panelui.dev/docs/components/message
