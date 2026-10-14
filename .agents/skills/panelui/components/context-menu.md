# ContextMenu

Actions for a piece of content, opened by holding it.

```tsx
import { ContextMenu } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { ContextMenu } from '@/components/ui/context-menu';
```

### Anatomy

```tsx
<ContextMenu>
  <ContextMenu.Trigger>…</ContextMenu.Trigger>
  <ContextMenu.Content>
    <ContextMenu.Preview />          {/* the held content, lifted */}
    <ContextMenu.Label>…</ContextMenu.Label>
    <ContextMenu.Item>…</ContextMenu.Item>
    <ContextMenu.Separator />
    <ContextMenu.CheckboxItem>…</ContextMenu.CheckboxItem>
    <ContextMenu.Sub>
      <ContextMenu.SubTrigger>…</ContextMenu.SubTrigger>
      <ContextMenu.SubContent>…</ContextMenu.SubContent>
    </ContextMenu.Sub>
  </ContextMenu.Content>
</ContextMenu>
```

### Parts

- `ContextMenu.Trigger` — Wraps the content the actions belong to. A hold opens at the pointer; the Show menu accessibility action, Context Menu key and Shift+F10 open against the measured target. Activate, Enter and Space run `onPress` when supplied, otherwise they open the menu. The content need not be pressable, and is not cloned or altered.
- `ContextMenu.Content` — The panel, and what a screen reader announces as a menu. Opens above the press and centred on it, over a dimmed screen, flipping below where there is no room.
- `ContextMenu.Preview` — The held content, lifted off the dimmed page while its actions are up. Draws the trigger's own children again unless given children of its own, and anchors the panel to the target so the two never overlap.
- `ContextMenu.Background` — The panel's surface, drawn behind every row and outside its scroller. Pass your own to put a gradient, an image or a blur under the rows.
- `ContextMenu.Label` — Non-interactive heading over a run of rows.
- `ContextMenu.Item` — One row: the verb at the leading edge, its `icon` at the trailing one. Dismisses the menu once it has run, unless `closeOnSelect` says otherwise.
- `ContextMenu.CheckboxItem` — A row carrying a state rather than an action. Keeps the menu open by default.
- `ContextMenu.RadioGroup` — A run of rows of which exactly one is chosen.
- `ContextMenu.RadioItem` — One option inside a `ContextMenu.RadioGroup`.
- `ContextMenu.Separator` — Hairline between two runs of rows.
- `ContextMenu.Sub` — Groups a `ContextMenu.SubTrigger` with the rows it reveals.
- `ContextMenu.SubTrigger` — The row that opens a submenu. Its chevron turns to point down once open.
- `ContextMenu.SubContent` — The rows a submenu reveals, opening in place rather than flying out sideways.

### Props

#### `ContextMenuTriggerProps`

Extends `Omit<ViewProps, 'children' \| 'onKeyDown'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Classes on the wrapper the content sits in, which lays out like any other view — it does not shrink to its child, because the things held are usually meant to fill their place in the layout. It is also the rect `anchor="target"` measures. |
| `children` | `ReactNode` | **required** | The content the actions belong to. Anything at all — it is not required to be pressable, and is not cloned or altered. |
| `anchor` | `ContextMenuAnchor` | `point` | `point` anchors the panel where the finger landed, `target` against the bounds of the whole trigger. Point is the default because a context menu's target is usually large, and the middle of a whole message is not where the press was. Reach for `target` when the target is small and list-shaped and the panel should read as lining up with it. Keyboard and accessibility opens always use the target bounds, because those modalities have no pointer coordinate. |
| `delay` | `number` | `350` | How long the hold has to last, in milliseconds. 350 by default. |
| `slop` | `number` | `12` | How far the finger may move during the hold before it stops being one, in points. 12 by default. Loose rather than tight, because the target is usually inside a scroller: a threshold small enough to feel precise cancels the menu for anyone whose thumb drifts while holding still, and a scroll has travelled much further than this by the time the two need telling apart. Tighten it only for a target that cannot be scrolled. |
| `onPress` | `() => void` | — | A short press on the target, which the hold never also counts as. |
| `haptics` | `boolean` | `false` | Tick the haptic engine as the menu opens. Needs the optional `expo-haptics`, and is silent without it. Worth setting more often than not. A hold has no edge to it the way a press does — nothing moves under the finger at the moment it takes — so the tick is what tells someone the hold has been long enough, before the panel has had time to say so. |
| `disabled` | `boolean` | `false` | Nothing opens the menu, and the short press stops firing too. |
| `onKeyDown` | `(event: ContextMenuKeyDownEvent) => void` | — | Called first for keyboard events. Prevent the event to keep ContextMenu from handling it. Context Menu and Shift+F10 open the menu; Enter and Space mirror the trigger's accessible activation. |

#### `ContextMenuPreviewProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | Drawn instead of the target itself. For a target that would be wrong to repeat — one carrying a video, a live map, a text field with a cursor in it — or one that should show more of itself once it has the screen. Left out, the target is drawn again as it stands, which is what makes the lift read as the content coming forward rather than as a picture of it appearing. |
| `className` | `string` | — | Extra classes on the lifted copy. |

#### `ContextMenuItemProps`

Extends `MenuItemProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `icon` | `ReactNode` | — | The row's glyph, drawn at the trailing edge rather than in front of the label. Painted to match the label unless it carries a colour of its own. |

#### `ContextMenuContentProps`

Extends `MenuContentProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `placement` | `MenuContentProps['placement']` | `bottom` | Which side of the anchor the panel opens on. Down from the press, flipping above it near the bottom of the screen. |
| `align` | `MenuContentProps['align']` | `start` | Where it sits along the other axis. From the press, not centred on it. |
| `offset` | `number` | `8` | Gap between the anchor and the panel. Small, so it reads as coming out of the press rather than floating near it. |
| `minWidth` | `number` | `280` | Floor for the panel's width. A context menu has no trigger to take its width from, and a column of one-word verbs is too narrow to aim at. |
| `scrim` | `boolean` | `true` | Dim the screen behind the panel. On here, unlike a plain popover. |

### Example — Actions on a message

The case this exists for. The panel opens where the finger landed, so it belongs to the bubble that was held rather than to the middle of it.

```tsx
<ContextMenu>
  <ContextMenu.Trigger haptics>
    <Message>
      <Message.Bubble>
        <Message.Bubble.Content>
          Would you like an interactive web-based todo application?
        </Message.Bubble.Content>
      </Message.Bubble>
    </Message>
  </ContextMenu.Trigger>

  <ContextMenu.Content>
    <ContextMenu.Item icon={<SparklesIcon size={16} />} onSelect={askAboutSelection}>
      Ask AI
    </ContextMenu.Item>
    <ContextMenu.Item icon={<ShareNodesIcon size={16} />} onSelect={share}>
      Share
    </ContextMenu.Item>
    <ContextMenu.Item icon={<CopyIcon size={16} />} onSelect={copy}>
      Copy
    </ContextMenu.Item>

    <ContextMenu.Separator />

    <ContextMenu.Item
      variant="destructive"
      icon={<ShieldAlertIcon size={16} />}
      onSelect={report}
    >
      Report
    </ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu>
```

### Notes

### It is a Menu

`ContextMenu.Item` is `Menu.Item` with its glyph moved and its rows made taller — a wrapper, not a second implementation. The separator, the label, the radio rows, the submenu and the panel's background are the same components outright. The destructive colour, the press-in scale and the dismiss-on-select rule are defined once, and cannot come to differ between the ⋯ button and the hold.

The panel is `Menu`'s, which is `Popover`'s, so edge-flipping, safe-area clamping, scrolling a long list and `presentation="bottom-sheet"` all arrive already working. What this component adds is what a menu opened on content needs and a menu opened from a button does not: alternate invocation paths, placement against either a pointer or the target, and the option of lifting that target out of the page with it.

Anything documented on the [Menu](/docs/components/menu) page for a row is true of the row here.

### Anchored to the finger

A toolbar menu is placed against its trigger, because the trigger is small and its position is the only sensible answer. A context menu's target is often most of the screen — a whole message, a whole card — and the middle of it is not where the press was. So the anchor is the press point.

The panel unfolds down and from that point rather than centred on it: centring would put half the panel back under the hand that opened it. The gap to the anchor is small for the same reason, so the panel reads as coming out of the press rather than floating near it.

`placement` and `align` move it, and neither is a promise — a panel with no room on the side it asked for flips to the other, and one that would run off an edge is clamped back inside the safe area. So a menu held near the bottom of the screen opens upwards without being asked to.

A point is simply a zero-sized anchor rectangle, which is why none of the placing, flipping or clamping needed a second code path for it.

### The verb first, the glyph last

`Menu` puts a row's glyph in front of its label, where the glyphs form a column the eye runs down to find the row it wants. A context menu is not read that way — it appears under the hand that opened it, already over the content, and what is being scanned is the words. So the words start at the leading edge, flush with one another, and the glyph sits at the far side confirming the row rather than introducing it.

The rows are also taller than `Menu`'s. A menu dropped from a button is aimed at deliberately; this one is landed on.

An icon is any element — `icon` is a `ReactNode`, so whichever set the app already uses goes straight in. It is painted to match its label, including the red of a destructive row, unless it carries a colour of its own.

### The hold, and the press underneath it

The target usually has a press of its own — open the thread, play the video, follow the link — and the two must not both fire.

The hold and the tap are handed to the gesture recogniser as alternatives, so it decides between them up front rather than after the fact. That is why the short press belongs on the trigger, as `onPress`, and not on the content inside it: a press handler further down is outside the arbitration and can still fire on the way to a hold.

It is also what lets the target be anything at all. Nothing is cloned onto the child and no pressable is required, so a plain bubble, card or image works — which is most of what content-native actions are attached to.

### Lifting the content with the menu

`ContextMenu.Preview`, declared among the rows, draws the held content again over the dimmed page and anchors the panel to it. What it draws is the trigger's own children, so the lift is the content itself coming forward at the size and in the place it already occupied — not a picture of it appearing somewhere else.

It is for a list, where without it the thing being acted on is one card among several behind a scrim and the panel is floating over all of them. With it there is no doubt which row the verbs apply to.

Its presence overrules `anchor`: the panel is placed outside whatever rectangle it is given, so anchoring to the target is what keeps it clear of the lifted copy. Anchor to the press instead and the panel opens across the very content the preview exists to hold up.

Pass `children` for a target that would be wrong to repeat — one carrying a video, a live map, a text field with a cursor in it — or one that should show more of itself once it has the screen. The lifted copy takes no touches either way: the actions are in the panel, and a second live copy of a pressable card would be a second place to press.

### The dim, and why a popover has none

The screen dims behind the panel, which a plain `Popover` does not do. A popover is a panel *beside* something and the page behind it is still live; a context menu is modal in practice, because the content underneath is what the actions are *about*. The dim is what says so, and tapping it dismisses.

### Holding has no edge

A press has a moment you can feel — something moves under the finger. A hold does not, so until the panel appears there is nothing telling anyone the hold has been long enough. `haptics` on the trigger ticks the moment the hold is accepted, which is why it is worth setting more often than not. It needs the optional `expo-haptics` and is silent without it.

### Accessibility and keyboard

The trigger is one accessible button with a named **Show menu** action. Show menu always opens the context actions; Activate runs `onPress` when the trigger has a primary short-press action, and otherwise opens the menu. That keeps a card that normally navigates behaving like the same card while still exposing its secondary actions. Disabled triggers announce that state and perform neither action.

On the web and with a hardware keyboard, the Context Menu key and Shift+F10 open the menu. Enter and Space mirror Activate. A keyboard or accessibility action has no pointer position, so it anchors the panel to the trigger's measured bounds; a pointer hold keeps its precise point.

The panel is announced as a menu and its rows as menu items, and it takes the Android back button while it is up. A visible ⋯ `Menu` can still be worth adding where discovering the available actions without opening them matters; it reuses the same row components.

### Focus after closing

On the web, closing returns keyboard focus to the element that had it before the overlay opened. Nested overlays return to the still-open parent first. If that element was removed or disabled while the overlay was open, it is skipped rather than focusing a stale control. Native screen-reader containment remains the platform's `accessibilityViewIsModal` behaviour.

---

Full page, with every example: https://panelui.dev/docs/components/context-menu
