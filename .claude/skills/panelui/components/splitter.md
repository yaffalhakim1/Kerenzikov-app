# Splitter

Panes that share a container, with a seam between them you can drag.

```tsx
import { Splitter } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Splitter } from '@/components/ui/splitter';
```

### Anatomy

```tsx
<Splitter>
  <Splitter.Panel>…</Splitter.Panel>
  <Splitter.Handle />
  <Splitter.Panel>…</Splitter.Panel>
</Splitter>
```

### Variants

- **orientation** — `horizontal` *(default)*, `vertical`

### Parts

- `Splitter.Panel` — One pane. It clips what is inside it, so a pane dragged narrower hides its content rather than pushing it into its neighbour.
- `Splitter.Handle` — The seam between two panes. Put one between each pair; a splitter with no handles is a fixed layout.

### Props

#### `SplitterProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `orientation` | `SplitterOrientation` | `horizontal` | Which way the panes are laid out. Defaults to `horizontal`. |
| `layout` | `number[]` | — | Controlled layout, as one percentage per panel. Pair it with `onLayoutChange`: a seam that is let go snaps back to this unless the value moves with it. |
| `defaultLayout` | `number[]` | — | Starting layout when uncontrolled, as one percentage per panel. Panels left out of it fall back to their own `defaultSize`, and then to an even share. |
| `onLayoutChange` | `(layout: number[]) => void` | — | Called with the new layout once a seam is let go, or stepped. |
| `disabled` | `boolean` | `false` | Freezes every seam. |
| `step` | `number` | `5` | How far one accessibility step moves a seam, in percent. Defaults to `5`. |

#### `SplitterPanelProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `defaultSize` | `number` | — | Starting share of the splitter, in percent. Unsized panes split the rest. |
| `minSize` | `number` | — | Smallest share this pane may hold while open, in percent. Defaults to `10`. |
| `maxSize` | `number` | — | Largest share this pane may hold, in percent. Defaults to `100`. |
| `collapsible` | `boolean` | — | Lets a drag past `minSize` shut the pane rather than stopping at it. |
| `collapsedSize` | `number` | — | Share this pane holds while shut, in percent. Defaults to `0`. |

#### `SplitterHandleProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `disabled` | `boolean` | `false` | Freezes this seam on its own, leaving the others draggable. |
| `withGrip` | `boolean` | `true` | Draws the grip in the middle of the seam. Defaults to `true`. |
| `accessibilityLabel` | `string` | `Resize panels` | What a screen reader calls the seam. Defaults to "Resize panels". |

### Example — Two panes

`defaultLayout` is one percentage per pane. `minSize` is the smallest share a pane may hold, so neither side can be dragged down to a sliver.

```tsx
<Splitter className="h-64 rounded-2xl border border-border" defaultLayout={[60, 40]}>
  <Splitter.Panel minSize={25} className="bg-surface-secondary p-4">
    <Text weight="medium">Inbox</Text>
    <Text size="sm" muted>12 conversations</Text>
  </Splitter.Panel>
  <Splitter.Handle />
  <Splitter.Panel minSize={25} className="p-4">
    <Text weight="medium">Thread</Text>
    <Text size="sm" muted>Pick a conversation to read it.</Text>
  </Splitter.Panel>
</Splitter>
```

### Notes

Double-tapping a handle restores that pair’s initial proportion inside the room the pair currently owns. The reset obeys the same minimum, maximum, and collapse constraints as a drag, so it never creates a layout ordinary interaction could not reach.

Dragging runs on the UI thread and never round-trips through React. `onLayoutChange` therefore fires when the seam is let go, not on every frame — a layout that re-rendered sixty times a second is the one thing that would make this feel slow. Anything that has to follow the drag itself should be inside a pane, where it is laid out by the pane rather than by a state update.

A seam is `adjustable` to a screen reader, with increment and decrement moving it `step` percent at a time, so the layout can be changed without a drag.

Minimums that add up to more than 100 cannot all be honoured. Every pane is shrunk in proportion rather than the last one being pushed out of the container, which keeps the problem visible — but it is a layout nobody asked for, so keep the total under 100.

A splitter needs a size on the axis it splits, because the panes are shares of it. A horizontal one fills the width it is given; a vertical one has no height of its own, so give it one or put it in something that has one. Inside a container that centres its children there is no width to fill, and a splitter with `w-full` in a box of its own is the way out of that.

Panes are sized by flex until the splitter has been measured, which is the first frame, and by measured points afterwards. The two agree, so there is nothing to see.

For a pane that slides over the content rather than beside it, use [Drawer](/docs/components/drawer) or [BottomSheet](/docs/components/bottom-sheet). For a row that slides aside to reveal actions, use [Swipe](/docs/components/swipe).

---

Full page, with every example: https://panelui.dev/docs/components/splitter
