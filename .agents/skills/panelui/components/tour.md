# Tour

A walkthrough that introduces a screen one control at a time.

```tsx
import { Tour } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Tour } from '@/components/ui/tour';
```

### Anatomy

```tsx
<Tour>
  <Tour.Step order={0} title="…" description="…">
    {/* the control this step is about */}
  </Tour.Step>
</Tour>
```

### Parts

- `Tour.Step` — Wraps the control a step is about, and is what gets measured. `order` puts it in the sequence.

### Props

#### `TourProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |
| `open` | `boolean` | — | Whether the walkthrough is running. |
| `defaultOpen` | `boolean` | `false` | Whether it is running when uncontrolled. |
| `onOpenChange` | `(open: boolean) => void` | — | — |
| `step` | `number` | — | The current step's `order`, controlled. Note that this is the author's numbering and not a position in the sequence — the two differ as soon as a step is conditional. |
| `defaultStep` | `number` | — | Where an uncontrolled tour starts. Defaults to the lowest `order`. |
| `onStepChange` | `(step: number) => void` | — | Fires with the `order` about to be shown, before it is. This is where a target inside a scroller is brought back into view: the step is measured on the next frame, so a `scrollTo` issued here lands first. |
| `onFinish` | `() => void` | — | The last step was acknowledged. |
| `onSkip` | `() => void` | — | The tour was ended early — the skip control, the backdrop, or Android back. |
| `padding` | `number` | `8` | Room left around every target, in pixels. 8 by default. A step may override it. |
| `radius` | `number` | `12` | Corner radius of a rectangular cutout, in pixels. 12 by default. A step may override it. |
| `shape` | `TourShape` | `rect` | Shape of every cutout. A step may override it. |
| `placement` | `TourPlacement` | `auto` | Which side of the target the card prefers. `auto` puts it below when below fits and above when it does not, which is the only behaviour that survives a target near an edge. |
| `dismissible` | `boolean` | `true` | Ending the tour by pressing the dimmed area, or Android back. Default true. |
| `showProgress` | `boolean` | `true` | Show "2 of 5" above the step's title. Default true. |
| `showSkip` | `boolean` | `true` | Show the skip control. Default true. |
| `interactive` | `boolean` | `false` | Leave the spotlit control pressable. Off by default: a tour is usually read rather than used, and a control that reacts under the dim invites people to start doing the thing before they have been told what it does. Turn it on for the walkthrough that asks you to try the step — the target keeps its own `onPress`, so advancing the tour from it is the app's call. |
| `overlayColor` | `string` | `rgba(0, 0, 0, 0.66)` | The dim laid over everything outside the cutout. Black at 66% by default — dark enough that the hole reads as the only lit thing, light enough that the screen behind it is still recognisable as the screen you were on. |
| `labels` | `TourLabels` | — | The words on the card's controls. |
| `cardClassName` | `string` | — | Extra classes for the card. |

#### `TourStepProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `order` | `number` | **required** | Where this step falls in the walkthrough. The author's numbering rather than the tree's, and unique within a tour — two steps sharing an order means one of them replaces the other. |
| `title` | `string` | — | The step's heading. |
| `description` | `string` | — | The sentence under it. |
| `shape` | `TourShape` | `rect` | Shape of this step's cutout, overriding the tour's. |
| `padding` | `number` | `8` | Room around this target, overriding the tour's. |
| `radius` | `number` | `12` | Corner radius of this cutout, overriding the tour's. |
| `placement` | `TourPlacement` | `auto` | Which side of this target the card prefers, overriding the tour's. |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | The control this step is about. |

### Example — A walkthrough

The ordinary case, and the one to start from. Steps wrap the controls they are about wherever those live — a header button, a card in a list, an action at the bottom — and `order` puts them in the sequence the screen should be read in rather than the one the tree happens to mount them in.

Nothing is placed by hand. The hole travels to each target and the card settles above or below it depending on which side has room.

```tsx
const [running, setRunning] = useState(false);

<Tour open={running} onOpenChange={setRunning}>
  <View className="flex-row items-center justify-between">
    <Text weight="semibold">Inbox</Text>
    <Tour.Step
      order={1}
      title="Filter what you see"
      description="Unread, flagged, or everything at once."
      shape="circle"
    >
      <Button variant="ghost" size="icon" accessibilityLabel="Filter">
        <SearchIcon size={20} />
      </Button>
    </Tour.Step>
  </View>

  <Tour.Step
    order={0}
    title="Your conversations"
    description="Everything waiting for a reply lands in this list."
    radius={16}
  >
    <Card>{/* … */}</Card>
  </Tour.Step>

  <Tour.Step
    order={2}
    title="Start something new"
    description="A message to anyone, from anywhere in the app."
  >
    <Button onPress={compose}>New message</Button>
  </Tour.Step>
</Tour>
```

### Notes

`order` is the author's numbering of the walkthrough, not the tree's — a tour usually crosses a header, a list and a tab bar in an order the layout knows nothing about. It is also what the controlled `step` prop refers to, so the two stay in the same units. Steps sort themselves by it.

Targets are measured in window coordinates each time their step becomes current, and again when the window changes size, so a rotation mid-tour re-places the spotlight rather than stranding it. The one case this cannot fix by itself is a target that has scrolled out of view: scroll it back in `onStepChange`, which fires with the step about to be shown and lands before the measurement.

A step whose target cannot be measured — one whose control has gone — gets no hole and a card in the middle of the screen. Dimming everything and saying nothing about where to look is honest; cutting a hole at the origin is not.

Android's back button ends a dismissible tour rather than navigating away from it, and the whole overlay respects reduced motion: the spotlight jumps between targets instead of travelling.

Each step owns its card measurement. When the active step changes, the next card stays hidden until its own height is known instead of briefly using the previous card's height and jumping between above/below placements.

---

Full page, with every example: https://panelui.dev/docs/components/tour
