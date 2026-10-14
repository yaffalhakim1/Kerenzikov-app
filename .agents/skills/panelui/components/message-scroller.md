# MessageScroller

Scroll behaviour a chat transcript needs.

```tsx
import { MessageScroller } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { MessageScroller } from '@/components/ui/message-scroller';
```

### Usage

```tsx
<MessageScroller autoScroll className="flex-1">
  <MessageScroller.List
    data={messages}
    renderItem={({ item }) => <Message>{item.body}</Message>}
  />
  <MessageScroller.Button />
</MessageScroller>
```

### Parts

- `MessageScroller.Viewport` — The backward-compatible ScrollView composition for short or structurally mixed transcripts. It mounts every child; prefer List for long or streaming threads.
- `MessageScroller.List` — The virtualized transcript. Takes data whose rows have stable messageId values, renders only a bounded native window, and owns follow, prepend retention, anchoring, and jump events.
- `MessageScroller.Content` — The transcript column. Announces additions rather than the whole list.
- `MessageScroller.Item` — One turn. It exists to be measured — without a boundary per turn there is nothing to scroll *to* and nothing to measure a prepend against.
- `MessageScroller.Button` — The way back to the live edge, shown only when there is one to go back to.

### Props

#### `MessageScrollerProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `autoScroll` | `boolean` | `false` | Follow new content down as it arrives — but only while the reader is already at the bottom. Scrolling up disengages it until they come back or press the button. |
| `preserveScrollOnPrepend` | `boolean` | `true` | Keep the reader on the same message when older ones are added above. Without it, loading history throws them a screen backwards. |
| `defaultScrollPosition` | `MessageScrollerPosition` | `end` | Where a freshly mounted transcript opens. `last-anchor` is the one to want for a saved thread: it lands on the last turn that started something, rather than at the very bottom of whatever the reply happened to be. |
| `children` | `ReactNode` | — | — |

#### `MessageScrollerViewportProps`

Extends `Omit< AnimatedScrollViewProps, 'onScroll' \| 'onScrollEndDrag' \| 'onMomentumScrollEnd' \| 'onContentSizeChange' >`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `MessageScrollerListProps`

Extends `<T MessageScrollerListItem = MessageScrollerListItem> extends Omit< FlatListProps<T>, \| 'data' \| 'renderItem' \| 'keyExtractor' \| 'onScroll' \| 'onContentSizeChange' \| 'onViewableItemsChanged' \| 'maintainVisibleContentPosition' \| 'onScrollToIndexFailed' \| 'onScrollEndDrag' \| 'onMomentumScrollEnd' \| 'CellRendererComponent' >`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `contentContainerClassName` | `string` | — | Classes on the virtualized list's padded transcript column. |
| `data` | `readonly T[]` | **required** | The complete transcript. Rows outside the native render window stay unmounted; each item therefore carries its stable navigation metadata. |
| `renderItem` | `(info: ListRenderItemInfo<T>) => ReactElement \| null` | **required** | Draw one turn from the native list window. |

#### `MessageScrollerContentProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `MessageScrollerItemProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `messageId` | `string` | **required** | Stable id for this turn. `scrollToMessage` takes the same value. |
| `scrollAnchor` | `boolean` | `false` | Marks this row as the start of a turn. `defaultScrollPosition="last-anchor"` opens on the last one, and it is what a saved thread should land on — the question, not the tail of the answer to it. |
| `children` | `ReactNode` | — | — |

#### `MessageScrollerButtonProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `target` | `'start' \| 'end'` | `end` | `end` jumps to the newest message, `start` to the beginning of the thread. |
| `accessibilityLabel` | `string` | — | — |
| `children` | `ReactNode` | — | — |

### Example — Following a streamed reply

`autoScroll` pins the viewport to the bottom as the reply grows — but only while the reader is already there. Scrolling up mid-stream disengages it, and `MessageScroller.Button` is how they opt back in.

```tsx
<MessageScroller autoScroll className="flex-1">
  <MessageScroller.Viewport>
    <MessageScroller.Content>
      {turns.map((turn) => (
        <MessageScroller.Item
          key={turn.id}
          messageId={turn.id}
          scrollAnchor={turn.role === "user"}
        >
          <Turn turn={turn} />
        </MessageScroller.Item>
      ))}

      {streaming ? (
        <Marker>
          <Marker.Content shimmer>Generating…</Marker.Content>
        </Marker>
      ) : null}
    </MessageScroller.Content>
  </MessageScroller.Viewport>
  <MessageScroller.Button />
</MessageScroller>
```

### Notes

**Choose the real list for long threads.** `MessageScroller.List` takes `data` items with a stable `messageId` and optional `scrollAnchor`, plus a normal FlatList `renderItem`. It defaults to a 12-row initial render, batches 8 rows, and keeps a 7-viewport window; the underlying FlatList still accepts tuning props. Unlike the compound `Viewport` / `Content` / `Item` path, rows outside that window are not mounted. Keep the compound path for short transcripts that need arbitrary non-row children, and migrate long threads by moving each `messageId` and `scrollAnchor` onto its data item.

**It needs a bounded height.** From `flex-1` in a column, or an explicit one. Given an unbounded parent it grows to fit its content and never scrolls at all.

**Follow-output is conditional, not automatic.** `autoScroll` means *follow the bottom while the reader is at the bottom* — never *drag them to the bottom*. Being pulled away from a message you were half way through reading is the behaviour this exists to avoid.

**Prepend retention is native in the virtualized path.** `maintainVisibleContentPosition` keeps the first visible row in place while history arrives above it, including when rows outside the render window have never mounted. Set `preserveScrollOnPrepend={false}` to opt out.

**Every turn needs a stable `messageId`.** It is the data identity for `scrollToMessage`, initial anchors, and React keys, so an id derived from the array index breaks navigation the moment anything is prepended.

**Scroll events are owned.** The virtualized path owns `onScroll`, `onContentSizeChange`, `onViewableItemsChanged`, prepend maintenance, and failed-index recovery; the compound viewport owns its four legacy scroll events. These handlers are the behavior, not decoration that a call site can replace.

---

Full page, with every example: https://panelui.dev/docs/components/message-scroller
