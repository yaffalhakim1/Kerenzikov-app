# ProgressButton

Press and hold to confirm, with the wait drawn on the button.

```tsx
import { ProgressButton } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { ProgressButton } from '@/components/ui/progress-button';
```

### Anatomy

```tsx
<ProgressButton>
  <ProgressButton.Label>Hold to confirm</ProgressButton.Label>
  <ProgressButton.Done />
</ProgressButton>
```

### Variants

- **variant** — `primary` *(default)*, `secondary`, `destructive`, `success`
- **size** — `sm`, `md` *(default)*, `lg`
- **shape** — `pill` *(default)*, `rounded`
- **fullWidth** — `true`
- **disabled** — `true`

### Parts

- `ProgressButton.Label`
- `ProgressButton.Done`

### Props

#### `ProgressButtonProps`

Extends `Omit<PressableProps, 'children' \| 'disabled'>, Omit<ProgressButtonVariantProps, 'disabled'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `holdDuration` | `number` | — | Milliseconds the button has to be held. Defaults to `2000`, and is floored at `200` — a hold that completes on touch-down is a button with extra steps. |
| `onComplete` | `() => void` | — | Fires once the hold has been sustained to the end. |
| `onCompletedChange` | `(completed: boolean) => void` | — | Fires whenever the completed state changes, including on a reset. |
| `completed` | `boolean` | — | Controlled completion. Leave unset to let the button own it. |
| `autoReset` | `boolean` | `false` | Return to the unfilled state after `autoResetDelay`. |
| `autoResetDelay` | `number` | — | Milliseconds to stay completed before resetting. Defaults to `1000`. |
| `disabled` | `boolean` | `false` | Dim the button and refuse the hold outright. The fill never starts, so there is no half-finished state to explain. |
| `haptics` | `boolean` | `false` | A tick as the hold takes, and a knock when it completes. Off by default: whether an action is worth feeling is the caller's call, not the control's. |
| `shape` | `ProgressButtonShape` | `pill` | The corner. `pill` by default — the fill is clipped by it, so a half-circle sends the wipe's leading edge out as a curve and the button reads as filling up. `rounded` gives it [Button](/docs/components/button)'s box exactly: the same radius, side padding and minimum width, at heights that already matched. Use it where the hold stands in a row of ordinary buttons — a form's footer, a toolbar, a card's actions — and a lone pill would read as a different kind of control rather than as the one that has to be held. |
| `children` | `ReactNode` | — | — |

#### `ProgressButtonLabelProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `ProgressButtonDoneProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | What the button shows once the hold has landed. A tick on its own by default; children replace it, so a word beside one is `<ProgressButton.Done><CheckIcon /><Text>Paid</Text></ProgressButton.Done>`. |

### Example — Hold to confirm

The default: two seconds, and nothing happens until the fill reaches the end.

```tsx
<ProgressButton onComplete={() => erase()}>
  <ProgressButton.Label>Hold to erase</ProgressButton.Label>
</ProgressButton>
```

### Notes

The fill grows on the UI thread and completion is read off the animation itself, not from a timer running beside it. Two clocks agree only while the app is idle; busy, a timer fires before the fill arrives, and the action happens earlier than the reader watched it happen.

**Releasing early plays the fill backwards.** One animation in two directions: same rate, same easing, same stepping under reduced motion. Letting go at nine tenths of a two-second hold takes 1.8 seconds to travel home, which is the 1.8 seconds it took to get there. A fill that vanishes has been deleted; a fill that travels back has been let go, and telling those apart is the reason the wait is drawn on the button at all.

Pressing again while it is on its way back picks it up from where it is rather than restarting the clock, so a second attempt is never slower than the first. `autoReset` and a controlled `completed` going false rewind the same way — the fill is never set to empty, only ever travelled there.

**The completed button stays completed.** Releasing after the fill has arrived does not drain it — only a release *before* it does. `autoReset` empties it after a delay, and a controlled `completed` empties it whenever you say so; without either, the button holds its finished state and stops accepting presses, which is the correct answer for an action that has already happened.

**A few points of finger drift will not abandon a hold.** `pressRetentionOffset` is 16, because a hand resting on a control for two seconds moves.

With the operating system set to reduce motion the fill advances in five steps instead of sweeping. It is still an indicator — a control that asks you to wait and shows nothing is a broken button, and what that setting is about is continuous movement.

The button announces as a button, with a hint saying it has to be held and a checked state once it has been. A single activation from an assistive technology does nothing on its own, so the hint carries the instruction rather than leaving it to the visible label.

**Every variant rests on the same secondary surface, and carries its colour in the label.** `primary`, `secondary`, `destructive` and `success` differ in the word and in what comes across it, not in the shape of the button. Drawn as four different outlines they were four different buttons before anything had happened, and the one thing all of them do — wait to be held — was the thing the drawing did not say.

The label is drawn twice, once on the surface in the variant's colour and once inside the fill in the fill's own foreground, so contrast holds on both sides of the wipe in either theme without a hardcoded value.

---

Full page, with every example: https://panelui.dev/docs/components/progress-button
