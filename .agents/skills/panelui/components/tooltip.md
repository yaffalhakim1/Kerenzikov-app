# Tooltip

A small label that names the control under your finger.

```tsx
import { Tooltip } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Tooltip } from '@/components/ui/tooltip';
```

### Anatomy

```tsx
<Tooltip>
  <Tooltip.Trigger>…</Tooltip.Trigger>
  <Tooltip.Content>
    <Tooltip.Arrow />
    <Tooltip.Title>…</Tooltip.Title>
    <Tooltip.Description>…</Tooltip.Description>
    <Tooltip.Text>…</Tooltip.Text>
  </Tooltip.Content>
</Tooltip>
```

### Variants

- **variant** — `inverted` *(default)*, `surface`

### Parts

- `Tooltip.Trigger` — Wraps a single child and reveals the label on it — a long press by default, a press when the root asks for one. It is also what gets measured, so the label knows where to sit; the wrapper shrinks to the child rather than filling the row, so the label is anchored to the control.
- `Tooltip.Content` — The label. Portaled above everything else, positioned against the trigger, and flipped or slid to stay inside the safe area. Text written directly inside it is wrapped in `Tooltip.Text` for you, so an arrow followed by a line of text needs no ceremony.
- `Tooltip.Arrow` — Optional point towards the trigger. Follows the resolved side, so it stays correct after a flip.
- `Tooltip.Title` — A heading, for a tooltip carrying more than a label.
- `Tooltip.Description` — The sentence under a `Tooltip.Title`, in the panel's secondary colour.
- `Tooltip.Text` — The label's default text, coloured to whatever the panel is made of. Compose it yourself when the label holds more than a single run of text.

### Props

#### `TooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | **required** | — |
| `open` | `boolean` | — | Controlled open state. |
| `onOpenChange` | `(open: boolean) => void` | — | — |
| `defaultOpen` | `boolean` | `false` | Initial state when uncontrolled. |
| `openOn` | `TooltipOpenOn` | `longPress` | Whether a long press or a plain press reveals the label. Long press is the default because it does not steal a tappable control's own press. |
| `duration` | `number` | `1500` | How long the label stays up before hiding itself, in milliseconds. `0` keeps it up until it is dismissed by a tap outside or the trigger again. |
| `label` | `string` | — | The label's text, mirrored onto the trigger as its accessibility label so a screen reader announces what the tooltip says without opening it. Set it whenever the trigger has no text of its own — an icon-only button. |

#### `TooltipTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Classes on the wrapper the child is measured through. It shrinks to the child by default; widen it only if the label should be anchored to something bigger than the control. |
| `children` | `ReactElement<{` | **required** | — |
| `onPress` | `(...args: unknown[]) => void` | — | — |
| `onLongPress` | `(...args: unknown[]) => void` | — | — |
| `accessibilityLabel` | `string` | — | — |
| `accessibilityHint` | `string` | — | — |

#### `TooltipContentProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `placement` | `TooltipPlacement` | `top` | Preferred side of the trigger. Flipped when that side does not fit. |
| `align` | `TooltipAlign` | `center` | Where the label sits along the trigger's other axis. |
| `offset` | `number` | `6` | Gap between the trigger and the label, in pixels. |
| `alignOffset` | `number` | `0` | Nudge along the alignment axis, in pixels. |
| `variant` | `TooltipVariant` | `inverted` | Which set of colours the panel, its arrow and its text draw from. `inverted` is the default and right for a label: a whisper over the page should read as a different layer rather than as another panel of it. `surface` matches the popover — reach for it once the tooltip carries a heading and a sentence, where the inversion stops reading as a whisper. |
| `width` | `number \| 'trigger' \| 'full' \| 'content-fit'` | `content-fit` | `content-fit` sizes to the content, `trigger` matches the trigger's width, `full` spans the safe area, and a number is that many pixels. Worth setting for anything longer than a label, which would otherwise run to whatever width the sentence happens to want. |
| `minWidth` | `number` | — | Floor for the panel's width, in pixels. |
| `maxHeight` | `number` | — | Ceiling for the panel's height, in pixels. Always clamped to the room inside the safe area, which is also the default. |
| `scrollable` | `boolean` | `false` | Scroll the body when it is taller than `maxHeight`. Off by default — a label has nothing to scroll, and a scroller around one only adds a bounce. |
| `children` | `ReactNode` | — | — |

#### `TooltipTitleProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `TooltipDescriptionProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `TooltipArrowProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

### Example — Naming an icon-only control

An icon button has no text for a screen reader to read. Pass `label` on the root and it becomes the trigger's accessibility label, so the control is announced without anyone having to open the tooltip. `openOn="press"` reveals it on a tap here, since the icon has no other press to protect.

```tsx
<Tooltip openOn="press" label="More information">
  <Tooltip.Trigger>
    <Button variant="ghost" size="icon" accessibilityLabel="Info">
      <InfoIcon size={20} />
    </Button>
  </Tooltip.Trigger>
  <Tooltip.Content>
    <Tooltip.Arrow />
    Syncs every 15 minutes
  </Tooltip.Content>
</Tooltip>
```

### Notes

**Placement is resolved, not obeyed.** The side is flipped only when the preferred one genuinely has less room than its opposite; after that the label is slid along the other axis to stay inside the safe area. That order matters — sliding first would let a badly placed label look like it fits.

**The label is measured before it is shown.** Its size is not known until it has laid out once, so the first frame is laid out off-screen and the entrance starts from the frame after. That entrance is driven by hand rather than by a preset, because it has to start from whichever side was resolved.

**The arrow points at the trigger, not the label.** When `align` shifts the label off-centre, or a clamp slides it back on screen, the arrow tracks the trigger's centre rather than the label's middle.

**The trigger wrapper shrinks to its child.** A view fills its parent by default, and a wrapper that filled the row would be measured as the whole row — putting a centred label over the middle of the screen instead of over the control. Pass `className` to `Tooltip.Trigger` if you want it anchored to something wider.

**The trigger is measured on every open**, not once on layout — a trigger inside a scroll view has moved since it was laid out, and a stale rectangle anchors the label to where it used to be.

**Long press is the default gesture.** It does not steal a tappable control's own press, so a button under a tooltip still works as a button. Use `openOn="press"` only when the trigger has no press of its own to protect, such as an icon that exists to be explained.

### Colours

Every colour the tooltip has — the panel, the arrow and the default text — comes from one `variant` on `Tooltip.Content`. It used to be three literals at three call sites, which meant retheming a tooltip took three separate `className` overrides that each had to be kept in step with the others.

`inverted` is the default: `--color-foreground` behind `--color-background` text. It is deliberately not a surface colour, because a one-line label over the page should read as a different layer rather than as another panel of it. Note what that means in a dark theme — `--color-foreground` is near-white there, so the label is a light slab with dark text. That is the intent, not a bug.

`surface` is the other reading, on `--color-popover` with a border, matching the popover exactly. Reach for it as soon as the tooltip carries a heading and a sentence.

The chosen variant is published on the tooltip's context, so `Tooltip.Arrow`, `Tooltip.Title`, `Tooltip.Description` and `Tooltip.Text` all follow it without being told again.

### Sizing

`width`, `minWidth`, `maxHeight` and `scrollable` behave exactly as they do on [Popover](/docs/components/popover): `content-fit` is the default, `trigger` matches the control that opened it, `full` spans the safe area, and a number is pixels. The height is always clamped to the room inside the safe area whether or not you cap it, because a panel taller than the screen has nowhere to slide to.

A label needs none of them. They exist for the `surface` case, where a sentence with no width runs to whatever the text wants and a paragraph with no cap runs off the screen.

Reach for a **Popover** instead when the content is interactive — a menu, a form, anything with its own controls. A tooltip is a label, not a surface, and it dismisses itself out from under a tap.

---

Full page, with every example: https://panelui.dev/docs/components/tooltip
