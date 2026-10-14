# SplitView

Two resizable stacked panes that settle on one of a few named heights.

```tsx
import { SplitView } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { SplitView } from '@/components/ui/split-view';
```

### Anatomy

```tsx
<SplitView>
  <SplitView.Top>…</SplitView.Top>
  <SplitView.DragArea>
    <SplitView.Handle />
  </SplitView.DragArea>
  <SplitView.Bottom>…</SplitView.Bottom>
</SplitView>
```

### Variants

- **variant** — `panes` *(default)*, `seam`

### Parts

- `SplitView.Top` — The upper pane. Its height is the one the seam moves; it clips what is inside it, so a pane dragged short hides its content rather than pushing it through the seam.
- `SplitView.Bottom` — The lower pane. It takes exactly the room the upper one gave up.
- `SplitView.DragArea` — The gap between the panes and the target for the drag. It takes real layout height, and that height is subtracted from the room the snap points divide.
- `SplitView.Handle` — The grip inside the drag area. Pass children to replace the default pill; it grows a little while the split is moving, which is the only thing on screen saying the gesture was received before the panes have moved far enough to say it themselves.

### Props

#### `SplitViewProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `variant` | `SplitViewVariant` | `panes` | How the split is drawn. `panes` gives each half its own rounded surface on a recessed ground, with the grip in the gap between them; `seam` is a hairline grip on a shared background, for a split inside something that already has a surface of its own. |
| `snapPoints` | `readonly number[]` | — | Heights the seam settles on. A number at or below `1` is a fraction of the room the panes share; anything larger is points. Defaults to `[0.2, 0.5, 0.8]`. |
| `minHeight` | `number` | — | Smallest the top pane may get, as a fraction or in points. Defaults to `100`. |
| `maxHeight` | `number` | — | Largest the top pane may get, as a fraction or in points. A negative number is measured back from the bottom — `-80` leaves eighty points for the other pane. Defaults to all the room there is. |
| `defaultSnapIndex` | `number` | `1` | Which snap point the seam starts at when uncontrolled. Defaults to `1`. |
| `snapIndex` | `number` | — | Controlled snap index. Pair it with `onSnapIndexChange`. |
| `onSnapIndexChange` | `(index: number) => void` | — | Called with the index the seam settled on. |
| `onSnap` | `(index: number, topHeight: number) => void` | — | Called once the pane has settled, with the index and its height in points. |
| `disabled` | `boolean` | `false` | Freezes the seam. The panes keep the heights they have. |
| `animateOnMount` | `boolean` | `false` | Springs to the starting snap point on mount instead of opening at it. |
| `children` | `ReactNode` | — | — |

#### `SplitViewPaneProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `SplitViewDragAreaProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `accessibilityLabel` | `string` | `Resize panes` | What a screen reader calls the seam. Defaults to "Resize panes". |
| `children` | `ReactNode` | — | — |

#### `SplitViewHandleProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

### Example — A pane at three heights

The default snap points are a fifth, a half and four fifths of the room the panes share. A flick lands on one of them.

```tsx
<SplitView className="h-96 rounded-2xl border border-border">
  <SplitView.Top>
    <View className="flex-1 justify-center bg-surface-secondary p-4">
      <Text weight="medium">Map</Text>
    </View>
  </SplitView.Top>
  <SplitView.DragArea>
    <SplitView.Handle />
  </SplitView.DragArea>
  <SplitView.Bottom>
    <View className="flex-1 justify-center p-4">
      <Text weight="medium">Results</Text>
    </View>
  </SplitView.Bottom>
</SplitView>
```

### Notes

### Controlled ownership

A controlled split only moves to an index its owner accepts. A drag or `snapTo` reports the request through `onSnapIndexChange`; if the prop stays where it was, the seam settles back there. `onSnap` describes the position that actually settled, including an external controlled change, rather than an unaccepted request.

### What the fractions are fractions of

The drag area takes real layout height, and that height is subtracted before the snap points are resolved. So `0.5` is half of what is actually divisible rather than half of a number the seam then eats into, and a taller drag area moves every snap point rather than only the largest. Points — any number above 1 — are used as written.

`maxHeight` also takes a negative number, measured back from the bottom: `-80` leaves eighty points for the lower pane whatever the container turns out to be.

Snap points are clamped into the range `minHeight` and `maxHeight` allow, sorted, and any two that land on the same height become one — a list with the same height twice makes a flick settle on a snap that looks like it did nothing.

### Releasing

A release settles on the nearest snap point to where the pane is *plus where the throw was going*, so a fast flick carries past a midpoint the finger never crossed. It never moves more than one point from where the pane actually is, however hard it is thrown — a release landing two snaps from where it was aimed reads as the control guessing.

Dragging runs on the UI thread. `onSnap` fires from the spring's completion, once, rather than on every frame — a layout that re-rendered sixty times a second is the one thing that would make this feel slow. `onSnapIndexChange` fires as soon as the destination is known.

### Reaching the layout from inside

`useSplitView` returns the live layout and a `snapTo`. `topHeight` is a shared value on the UI thread — read it in a worklet, not in render, where it is only ever the number the last commit happened to see.

### Accessibility

The drag area is `adjustable`, and increment and decrement step through the snap points rather than by a distance. Those are the positions this control has, and announcing a percentage nobody can stop at would describe a different control.

With the operating system set to reduce motion the seam moves to its snap point without the spring, and the grip does not scale.

### SplitView or Splitter

Reach for SplitView when the layout has a few right answers — a map over a list, a preview over an editor — and the reader should land on one of them. Reach for [Splitter](/docs/components/splitter) when any division is valid, when there are more than two panes, or when the split runs across rather than down.

---

Full page, with every example: https://panelui.dev/docs/components/split-view
