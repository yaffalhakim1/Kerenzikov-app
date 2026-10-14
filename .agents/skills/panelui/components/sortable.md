# Sortable

A list whose rows can be dragged into a different order.

```tsx
import { Sortable } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Sortable } from '@/components/ui/sortable';
```

### Anatomy

```tsx
<Sortable value={ids} onReorder={…}>
  <Sortable.Item id="…">
    {/* the row itself — anything at all */}
    <Sortable.Handle />   {/* the part that lifts it */}
  </Sortable.Item>
</Sortable>
```

### Parts

- `Sortable.Item` — One row. Measures itself, carries its own transform, and holds the drag.
- `Sortable.Handle` — The part of a row that lifts it. Inert in a list that lifts on a long press, where the whole row already carries the gesture.

### Props

#### `SortableProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `string[]` | **required** | The ids of the rows, in the order they are rendered below. It is the caller's array rather than the component's, because only the caller knows what an id stands for — an order held here that disagreed with the children would put rows in places their content had not moved to. |
| `children` | `ReactNode` | — | The rows, one `Sortable.Item` per id in `value` and in the same order. They may be wrapped in anything; each row registers itself. |
| `onReorder` | `(order: string[], details: SortableReorderDetails) => void` | — | Told the new order once the dropped row has settled, and where it came from and went. Rearrange your own list from `details` — `reorderItems` does exactly this move. |
| `gap` | `number` | `0` | Space between rows, in points. A prop rather than a `gap` class because the drag has to know it: the slot a row lands in is measured, and a gap the component cannot read is a gap it drops rows into the middle of. |
| `activation` | `SortableActivation` | `handle` | What lifts a row. `handle` is the default and the safer one — the rest of the row stays free to be pressed, and a list of rows with buttons on them still works. `longPress` gives the whole row to the drag. |
| `longPressDelay` | `number` | `220` | How long `longPress` activation waits, in milliseconds. |
| `haptics` | `boolean` | `true` | Knock when a row is lifted, tick as it passes each slot. On by default: a drag with no feedback under the finger is the interaction people give up on halfway through, unsure whether anything is happening. |
| `disabled` | `boolean` | `false` | Turn every row's drag off and leave the list static. |
| `scrollRef` | `AnimatedRef<Animated.ScrollView>` | — | The scroller the list sits in, from `useAnimatedRef`. Given one, a drag carried to the top or bottom edge scrolls it, so a list longer than the screen can be reordered end to end. Without it a drag stops at the edge, which is correct for a list that fits. |
| `autoscrollThreshold` | `number` | `72` | Points from the scroller's edge at which the scrolling begins. |
| `autoscrollSpeed` | `number` | `8` | Points per frame at the very edge, tapering to nothing at the threshold. |
| `onDragStart` | `(id: string) => void` | — | Told which row was lifted, the moment it is. |
| `onDragEnd` | `(id: string) => void` | — | Told when it lands, whether or not the order changed. |

#### `SortableItemProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `id` | `string` | **required** | What this row is, and the id that appears in `value` and in the order handed back. Stable across renders — an id derived from the index changes the moment the list is reordered, and the rows lose track of themselves. |
| `children` | `ReactNode` | — | — |
| `disabled` | `boolean` | `false` | Stop this row being picked up. The others still move past it, because a row that cannot be dragged is not the same as a row that cannot be displaced — that is what `pinned` is for, and conflating the two would mean silently refusing drops that look like they worked. |
| `pinned` | `boolean` | `false` | Hold this row's place in the list. It cannot be picked up, and — unlike a `disabled` row — nothing else can take its slot either: the rows being dragged reorder among the places left over, and one carried past this row goes around it rather than through it. For the row that means something by being where it is. A header, a total, a step that has to come first. |
| `activeClassName` | `string` | — | Extra classes for the row while it is being carried, applied last. A lifted row is given an opaque surface and a shadow so it is never drawn see-through over the rows it is passing; this is what overrides that. |

#### `SortableHandleProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | Replaces the grip glyph. Anything at all — the drag is on the box. |
| `accessibilityLabel` | `string` | `Drag to reorder` | What a screen reader calls the grip. |

### Example — A list you can reorder

The whole of it. `value` is the current order, `onReorder` is told where the row landed, and `reorderItems` applies that move to the list the ids came from. The rows are ordinary `Item`s — anything at all can go inside a row, because the component only ever adds a transform to it.

```tsx
const [tasks, setTasks] = useState([
  { id: 'a', title: 'Draft the release notes' },
  { id: 'b', title: 'Cut the tag' },
  { id: 'c', title: 'Publish to npm' },
  { id: 'd', title: 'Post the changelog' },
]);

<Sortable
  value={tasks.map((task) => task.id)}
  onReorder={(_, { from, to }) => setTasks((t) => reorderItems(t, from, to))}
  gap={8}
>
  {tasks.map((task, index) => (
    <Sortable.Item key={task.id} id={task.id}>
      <Item variant="outline">
        <Item.Media variant="icon">
          <Text size="sm" muted>{index + 1}</Text>
        </Item.Media>
        <Item.Content>
          <Item.Title>{task.title}</Item.Title>
        </Item.Content>
        <Sortable.Handle />
      </Item>
    </Sortable.Item>
  ))}
</Sortable>
```

### Notes

### Why the drop is reported late

`onReorder` fires when the row has finished settling, not when the finger lifts. Between those two moments the row is springing into a slot the layout does not know about yet, and re-rendering the list in the middle of that would relayout every row underneath one that is still moving. By the time the callback runs the rows are already where the new order puts them, so the re-render that follows changes nothing on screen.

It also means the list is briefly out of step with `value` — for the length of one spring. Nothing else should be reading the order in that window, and `onDragEnd` fires at the same moment if you need to know a drag is over regardless of whether anything moved.

### Ids have to be stable

An id derived from the index changes the moment the list is reordered, and the rows lose track of themselves — the one being dragged becomes a different row halfway through the drag. Use whatever your data already calls itself.

### Where a row lands

The dragged row moves to the first slot whose middle it has passed, walking outwards from where it started rather than scanning the list for the nearest slot. With rows of unequal height a nearest-slot search can hand back a slot two places away that happens to be closer, which reads on screen as the row skipping one.

### Reordering without the gesture

A drag is invisible to a screen reader: there is nothing on screen to announce and no way to discover it from the row. **Move up** and **Move down** are published as accessibility actions instead. They move the row one slot and report the drop straight away — nothing is in flight, so there is nothing to wait for.

They sit wherever the drag does. A list that lifts from a grip puts them on `Sortable.Handle`, which is an element in its own right: it answers a swipe up or down with the same move and announces the position the row is currently in. A list that lifts on a long press has no grip and gives the whole row to the drag, so the row carries them and is read as a single element.

### What a lifted row looks like

A row being carried is drawn over the ones it is passing, so the component gives it a surface of its own — an opaque background, a shadow, and a small step up in scale. That is not decoration. `Sortable.Item` is only a box around whatever you put inside it, and plenty of what goes in a list row has no background of its own; without a surface the lifted row is see-through, and the rest of the list can be read straight through the middle of it.

It comes loose and settles back on one spring driven from the gesture, so the row starts returning to its own size the moment the finger leaves rather than once it has landed — the shrink and the drop are one movement instead of two in a row. `activeClassName` replaces any of it.

### What it is not

One axis, and no virtualisation. The rows are laid out in a column and all of them are mounted, which is the right trade for the lists people actually reorder by hand — a playlist, a set of form fields, a run of dashboard tiles. A list long enough to need windowing is a list nobody is going to drag the length of.

---

Full page, with every example: https://panelui.dev/docs/components/sortable
