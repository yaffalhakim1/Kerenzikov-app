# Swipe

A row that slides aside to reveal the things you can do to it.

```tsx
import { Swipe } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Swipe } from '@/components/ui/swipe';
```

### Anatomy

```tsx
<Swipe.Group>
  <Swipe>
    <Swipe.Start>
      <Swipe.Action label="…" />
    </Swipe.Start>
    <Swipe.End>
      <Swipe.Action label="…" />
    </Swipe.End>
    {/* the row itself — anything at all */}
  </Swipe>
</Swipe.Group>
```

### Variants

- **color** — `default` *(default)*, `primary`, `success`, `warning`, `info`, `destructive`

### Parts

- `Swipe.Group` — Wraps a list of rows so only one of them is open at a time. Optional — a lone `Swipe` needs no group — but every list of them wants one.
- `Swipe.Start` — Actions revealed by dragging toward the end edge. Declares which side its children belong to; the root lays them out.
- `Swipe.End` — Actions revealed by dragging toward the start edge — the destructive side by convention.
- `Swipe.Action` — One tile: an icon, a label, and what to run. Sized by its own content down to a minimum wide enough to hit.

### Props

#### `SwipeGroupProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |
| `exclusive` | `boolean` | — | Close the other rows when one opens. On by default — that is the whole reason to reach for a group. Turning it off keeps the container and the `useSwipeGroup` handle while letting several rows stand open at once. |

#### `SwipeActionProps`

Extends `Omit<ViewProps, 'children'>, VariantProps<typeof actionVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `label` | `string` | **required** | What the action does. Also what a screen reader is offered. |
| `icon` | `ReactNode` | — | Drawn above the label and tinted to match it. Pass the glyph, not a colour and not a size — a tile sizes it to read at a glance, since it is the part of an action the eye reaches before the word underneath it. |
| `onPress` | `() => void` | — | Run when the tile is tapped, or when a full swipe reaches it. |
| `keepOpen` | `boolean` | `false` | Leave the row open after the action runs. Off by default: an action that has already happened has nothing left to offer, and a row left standing open is the most common way a swipe list ends up feeling stuck. |
| `labelClassName` | `string` | — | Extra classes for the label. |

#### `SwipePanelProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `SwipeProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | The row itself, plus a `Swipe.Start` and/or `Swipe.End` holding its actions. Order does not matter — the panels are recognised by type. |
| `fullSwipe` | `boolean` | `true` | Let a drag carried well past the panel fire its outermost action on release, without the tile ever being tapped. On by default, and the reason the far end of a panel is the destructive slot by convention. |
| `disabled` | `boolean` | `false` | Turn the gesture off and leave the row static. The tiles stay tappable. |
| `haptics` | `boolean` | `false` | Tick when a drag crosses the point at which letting go fires an action. |
| `onOpenChange` | `(side: SwipeOpenSide) => void` | — | Told which side opened, or `null` when the row closed. |
| `contentClassName` | `string` | — | Extra classes for the moving row. |

### Example — Swipe to delete

The common case. One action on the end side, in the destructive colour, and a drag carried far enough fires it without the tile ever being tapped.

```tsx
const [rows, setRows] = useState(['Invoice.pdf', 'Contract.docx', 'Notes.md']);

<Item.Group>
  {rows.map((name) => (
    <Swipe key={name} haptics>
      <Swipe.End>
        <Swipe.Action
          icon={<TrashIcon />}
          label="Delete"
          color="destructive"
          onPress={() => setRows((r) => r.filter((n) => n !== name))}
        />
      </Swipe.End>
      <Item>
        <Item.Content>
          <Item.Title>{name}</Item.Title>
        </Item.Content>
      </Item>
    </Swipe>
  ))}
</Item.Group>
```

### Notes

A panel is exactly as wide as the gap the row has left behind — never wider, so it cannot paint over the row, and never narrower, so carrying the drag past the tiles extends the outermost action's colour instead of opening a hole onto the screen underneath. The row therefore needs no background of its own, and the two never overlap at any point in the gesture.

### Which action a full swipe fires

The one furthest from the row, because that is the one the gesture travelled all the way to. On the end side that is the last tile declared, on the start side the first — in both cases the tile at the outer edge, whose colour the panel takes and which grows to fill the gap as the drag is carried past it. Put the destructive action there, or turn the behaviour off with `fullSwipe={false}`.

### Closing every row at once

`useSwipeGroup()` returns `closeAll`, which shuts every row in the enclosing `Swipe.Group`. It is the one thing a group knows that a single row cannot: a list that scrolls, navigates away, or has just deleted the row that was open wants all of them put back, and holding a ref to each row to do it by hand is bookkeeping the group is already doing. It reads a group from above it, so the component that calls it has to sit inside the `Swipe.Group` rather than be the thing rendering it. Outside a group it is inert rather than an error.

### Sharing the screen with a scroller

The drag waits for clearly horizontal intent and fails outright the moment the finger commits vertically, so a list of swipeable rows scrolls the way an ordinary list does and no row twitches open under a scroll. Inside a *horizontal* scroller the two do want the same axis — there the row should be `disabled`, or the scroller should be the one that gives way.

### Reaching the actions without the gesture

A swipe is invisible to a screen reader: there is nothing on screen to announce, and no way to discover the gesture from the row itself. Every action is therefore also published as an accessibility action on the row, named by its `label` — which is why `label` is required and why it should say what the action does rather than name an icon.

### Opening it yourself

The row is uncontrolled, and a ref is how you reach it: `open('start' | 'end')` and `close()`. `onOpenChange` reports the side that opened, or `null` when the row closed — enough to keep only one row of a list open at a time by closing the previous one.

---

Full page, with every example: https://panelui.dev/docs/components/swipe
