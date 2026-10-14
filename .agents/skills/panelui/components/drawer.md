# Drawer

A panel that comes in from an edge of the screen and covers the app until dismissed.

```tsx
import { Drawer } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Drawer } from '@/components/ui/drawer';
```

### Usage

```tsx
<Drawer>
  <Drawer.Trigger>
    <Button variant="outline">Open menu</Button>
  </Drawer.Trigger>
  <Drawer.Content>
    <Drawer.Header title="Workspace" description="Switch project or manage members." />
    <Drawer.Body>
      {['Projects', 'Members', 'Billing'].map((label) => (
        <Item key={label}>
          <Item.Content>
            <Item.Title>{label}</Item.Title>
          </Item.Content>
        </Item>
      ))}
    </Drawer.Body>
    <Drawer.Footer>
      <Drawer.Close>
        <Button variant="outline" className="flex-1">Close</Button>
      </Drawer.Close>
    </Drawer.Footer>
  </Drawer.Content>
</Drawer>
```

### Variants

- **side** — `start` *(default)*, `end`, `top`, `bottom`

### Parts

- `Drawer.Trigger` — Clones its child and opens the drawer on press.
- `Drawer.Content` — The panel. Renders through a portal above everything else, and owns the edge, the size and the swipe.
- `Drawer.Header` — A title and a line under it. Leaves the corner the close button took clear, on whichever side that is — including when `closeSide` moved it.
- `Drawer.Body` — The scrolling part. Its axis is the one the drawer is *not* dragged on, so the two never compete.
- `Drawer.Footer` — A row pinned below the body, for the action the drawer is asking about.
- `Drawer.Close` — Clones its child and closes the drawer on press.

### Props

#### `DrawerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | **required** | — |
| `open` | `boolean` | — | Open state, when you want to own it. Pair with `onOpenChange`. |
| `onOpenChange` | `(open: boolean) => void` | — | Called with the next open state, whether the drawer or you caused it. |
| `defaultOpen` | `boolean` | `false` | Open state to start at when you are not controlling it. |

#### `DrawerTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactElement<{ onPress?: (...args: unknown[]) => void }>` | **required** | A single pressable element. Its own `onPress` still runs. |

#### `DrawerCloseProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactElement<{ onPress?: (...args: unknown[]) => void }>` | **required** | A single pressable element. Its own `onPress` still runs. |

#### `DrawerContentProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `side` | `DrawerSide` | `start` | Which edge the drawer is docked to. `start` and `end` are the edges text begins and ends at, so both follow the enclosing `<Direction>` rather than pinning the drawer to a physical side. |
| `size` | `DrawerSize` | `md` | How much of the screen the drawer takes — its width on `start` / `end`, its height on `top` / `bottom`. A horizontal drawer is also capped in points, so `md` is a 320-point navigation panel on a tablet rather than 78% of it. |
| `dismissible` | `boolean` | `true` | Tap on the backdrop closes the drawer. Default true. |
| `swipeToDismiss` | `boolean` | `true` | Drag the drawer back toward its edge to dismiss it. Default true. Turn it off for a drawer whose content wants the same axis — a horizontal scroller in a side drawer. |
| `showClose` | `boolean` | `true` | Show a close button in the drawer's inner top corner. Default true. |
| `closeSide` | `DrawerCloseSide` | — | Which top corner the close button takes. Logical, like `side`: `end` is the corner text runs toward, so it is the right one in a left-to-right app and the left one in a right-to-left one. Defaults to the corner *away* from the docked edge, so an `end` drawer's button does not sit against the screen edge the panel came out of. Set it when the drawer reads better with the button on the outer corner instead — a panel people close by reaching for the same corner every time. |
| `blur` | `boolean` | `false` | Frost the screen behind the drawer instead of dimming it. Needs the optional `expo-blur`; without it this dims, rather than failing. Someone who has Reduce Transparency switched on gets an opaque backdrop instead, which is the whole point of the setting. |
| `children` | `ReactNode` | — | — |

#### `DrawerHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `ReactNode` | — | Heading for the drawer. Strings are wrapped; anything else is drawn as given. |
| `description` | `ReactNode` | — | A line under the title, for what the drawer is for. |
| `children` | `ReactNode` | — | — |

#### `DrawerBodyProps`

Extends `ScrollViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `scrollable` | `boolean` | `true` | Scroll the body when it overflows. Pass `false` to lay the content out plainly instead — for a drawer whose content is known to fit, and for one that brings its own list, since a scroller nested inside this one leaves neither of them scrolling properly. |
| `children` | `ReactNode` | — | — |

#### `DrawerFooterProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

### Example — Navigation drawer

The default: docked to the start edge, sized to `md`, with a header, a scrolling body and a footer.

```tsx
<Drawer>
  <Drawer.Trigger>
    <Button variant="outline">Open menu</Button>
  </Drawer.Trigger>
  <Drawer.Content>
    <Drawer.Header title="Workspace" description="Switch project or manage members." />
    <Drawer.Body>
      {['Projects', 'Members', 'Billing'].map((label) => (
        <Item key={label}>
          <Item.Content>
            <Item.Title>{label}</Item.Title>
          </Item.Content>
        </Item>
      ))}
    </Drawer.Body>
    <Drawer.Footer>
      <Drawer.Close>
        <Button variant="outline" className="flex-1">Close</Button>
      </Drawer.Close>
    </Drawer.Footer>
  </Drawer.Content>
</Drawer>
```

### Notes

Control it with `open` / `onOpenChange`, or leave it uncontrolled with `defaultOpen`.

### Why the sides are `start` and `end`

A drawer is the one overlay whose whole identity is the edge it belongs to, and in a right-to-left app the navigation edge is the right one. Naming the sides `left` and `right` would bake a reading direction into the API and leave every caller in an RTL app inverting it by hand, so they are logical instead: `start` is the edge text begins at, `end` the edge it runs toward. Both follow the enclosing `Direction`. `top` and `bottom` mean what they say, because the vertical axis does not mirror.

The panel's position mirrors because it is laid out from logical insets. The *drag* does not — a transform is measured in raw pixels, not laid out — so the gesture reads the direction and negates itself. That is what keeps a swipe outward dismissing in both directions instead of only one.

The drawer also re-establishes the reading direction on its own layer. It is portaled above the app, which takes it out of the `Direction` subtree it was written inside — so a panel that did not put the direction back would dock to the wrong edge and lay its rows out the wrong way while its animation came from the right one. Worth knowing if you portal an overlay of your own.

### How wide it opens

`size` is a fraction of the screen with a cap in points on the horizontal axis. The cap is the point: a fraction alone reads correctly on a phone and absurdly on a tablet, where 78% of the width is a navigation list with a column of whitespace beside it. `full` is 94%, not 100% — the sliver of app left showing is what says it is still there behind the drawer, and it is the only thing left to tap to dismiss.

### Where it stops

The panel is drawn behind the status bar, not below it — a surface the app disappears under should reach the edge of the screen rather than stopping short of it and leaving a strip of app above. The *content* is the part that clears it: the safe-area inset and the panel's own padding stack, so the header starts a clear gap below the clock instead of flush against it. The same goes for the bottom, where every side but `top` reaches the screen edge and pads its content clear of the home indicator.

### Which corner the ✕ takes

By default the corner *away* from the docked edge, so an `end` drawer's button sits on its inner side rather than against the screen edge the panel came out of. `closeSide` overrides that, and is logical like `side` is: `end` is the corner text runs toward, so it is the right one in a left-to-right app and the left one in a right-to-left one. Set it for a panel that is opened and closed all day, where a target always under the same thumb beats one that moves with the edge.

`Drawer.Header` reserves whichever corner the button ended up in, so a long title wraps above it instead of running underneath. That is one decision read from two places, which is why it is resolved once rather than worked out again by the header.

### Dismissing it

A tap on the backdrop, a drag back toward the docked edge, the corner close button, `Drawer.Close`, or the Android back button. A dismissing drag does not spring the panel back to the edge first — the exit picks it up wherever the finger left it and carries it the rest of the way, so every route out is the same single slide. Turn the first two off with `dismissible={false}` and `swipeToDismiss={false}` — turn off `swipeToDismiss` when the content wants the same axis, such as a horizontal scroller in a side drawer.

### Drawer or BottomSheet

A sheet is sized by its content and dragged along the axis its scroller runs on, which is why so much of it is about sharing one drag between the two. A side drawer is sized by the screen and dragged across its scroller's axis, so the two never compete: the cross-axis drag fails and the list keeps it. Reach for the sheet for something the content sizes — a share menu, a short form — and the drawer for navigation, filters, and anything that should feel like part of the app's frame.

### Focus after closing

On the web, closing returns keyboard focus to the element that had it before the overlay opened. Nested overlays return to the still-open parent first. If that element was removed or disabled while the overlay was open, it is skipped rather than focusing a stale control. Native screen-reader containment remains the platform's `accessibilityViewIsModal` behaviour.

---

Full page, with every example: https://panelui.dev/docs/components/drawer
