# Feedback

Dialog whose body is a well to write in, with the actions in the band around it.

```tsx
import { Feedback } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Feedback } from '@/components/ui/feedback';
```

### Anatomy

```tsx
<Feedback>
  <Feedback.Trigger>…</Feedback.Trigger>   {/* opens it */}
  <Feedback.Content>            {/* the shell, and the recessed band */}
    <Feedback.Panel>           {/* the well */}
      <Feedback.Title>…</Feedback.Title>
      <Feedback.Close />       {/* the ✕, in the well's corner */}
      <Feedback.Field />       {/* what is being written */}
    </Feedback.Panel>
    <Feedback.Footer>          {/* in the band, narrower than the well */}
      <Feedback.Cancel />
      <Feedback.Submit />
    </Feedback.Footer>
  </Feedback.Content>
</Feedback>
```

### Variants

- **tone** — `cancel`, `submit`
- **disabled** — `true`

### Parts

- `Feedback.Trigger` — Wraps its child and opens the dialog on press. Leave it out for a dialog opened from somewhere else and driven by `open`.
- `Feedback.Content` — The shell: the scrim, the recessed band, and the dismiss surface behind it. `dismissible={false}` takes away the tap-outside and the Android back press; `blur` frosts the screen behind instead of dimming it.
- `Feedback.Panel` — The well set into the shell. Its corner is the shell's less the shell's padding, so the two curves stay concentric.
- `Feedback.Title` — The question. Held clear of the ✕ by padding on the end, so a title you centre needs `ps-9` to match — centred text in a box inset on one side only sits off the panel's middle.
- `Feedback.Close` — The ✕ in the well's corner. Drawn at 22 points with the slop that takes its touch box to 48 — a circle large enough to press comfortably would be taller than the line it sits on.
- `Feedback.Field` — What is being written. No border and no background of its own: it is already inside a well, and an outline drawn inside one is two edges making the same point. Grows past `minHeight` as the message does.
- `Feedback.Footer` — The action row, held in from the shell's edge. Narrower than the well on purpose — a row running the full width reads as a third edge of the dialog rather than as two things to press.
- `Feedback.Cancel` — Discards and closes. Pass `onPress` to do something else first.
- `Feedback.Submit` — Sends, through `onSubmit`. Inert while the field is empty, and it does not close the dialog — sending usually has to finish first, and a dialog that closed on the press would take its own error message with it.

### Props

#### `FeedbackProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | `Cancel` | — |
| `open` | `boolean` | — | Controlled open state. |
| `onOpenChange` | `(open: boolean) => void` | — | — |
| `defaultOpen` | `boolean` | `false` | Initial state when uncontrolled. |
| `value` | `string` | — | The message, when the caller holds it. Leave unset to let the field keep it. |
| `defaultValue` | `string` | `` | Starting message for an uncontrolled field. Ignored once `value` is passed. |
| `onValueChange` | `(value: string) => void` | — | — |

#### `FeedbackContentProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `dismissible` | `boolean` | `true` | Whether tapping outside or pressing back closes it. |
| `blur` | `boolean` | `false` | Frost the screen behind instead of dimming it. Needs `expo-blur`. |
| `children` | `ReactNode` | `Cancel` | — |

#### `FeedbackPanelProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | `Cancel` | — |

#### `FeedbackCloseProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `label` | `string` | `Close` | How the ✕ announces itself. |
| `onPress` | `() => void` | — | Runs instead of closing. Call `onOpenChange` yourself if you pass this. |

#### `FeedbackFieldProps`

Extends `Omit<TextInputProps, 'value' \| 'onChangeText'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `string` | — | The message. Leave unset to let the dialog hold it. |
| `onChangeText` | `(value: string) => void` | — | — |
| `minHeight` | `number` | `200` | Room to write in before the field starts growing. |

#### `FeedbackFooterProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | `Cancel` | — |

#### `FeedbackActionProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `labelClassName` | `string` | — | — |
| `disabled` | `boolean` | — | — |
| `onPress` | `() => void` | — | — |
| `children` | `ReactNode` | `Cancel` | — |

#### `FeedbackSubmitProps`

Extends `FeedbackActionProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `onSubmit` | `(value: string) => void` | — | Hand the message to the caller. The dialog does not close itself here — sending usually has to finish first, and a dialog that closed on the press would take its own error message with it. |

### Example — Asking for a sentence

The shape the component is for. The dialog holds the message, `Submit` refuses to send an empty one, and Cancel closes without asking again.

```tsx
const [open, setOpen] = useState(false);

<Feedback open={open} onOpenChange={setOpen}>
  <Feedback.Trigger>
    <Button variant="outline">Give feedback</Button>
  </Feedback.Trigger>
  <Feedback.Content>
    <Feedback.Panel>
      <Feedback.Title>What should we fix first?</Feedback.Title>
      <Feedback.Close />
      <Feedback.Field placeholder="Tell us what got in your way" />
    </Feedback.Panel>
    <Feedback.Footer>
      <Feedback.Cancel />
      <Feedback.Submit onSubmit={(message) => send(message)} />
    </Feedback.Footer>
  </Feedback.Content>
</Feedback>
```

### Notes

### The two actions are equal, and one of them is not

Cancel and Submit take the same width, because they are the same size of decision — this is a sentence somebody wrote, not a deletion. What separates them is weight: Submit is filled in the foreground colour and Cancel is a tint of it.

Disabled, Submit drops the fill rather than dimming it. A tinted accent pill still reads as the thing to press at any opacity, so an inert one gets pressed and then gets reported as broken. The tint it falls back to is fainter than Cancel's, so the pair reads as one live action and one dead one rather than as two Cancels.

### Where the recess comes from

The shell is the popover surface with `--color-inset` laid over it rather than a colour of its own. That token is a translucent black in every theme, so the shell always comes out darker than the panel it holds.

The surface ladder cannot do this job: it runs darker in a light theme and lighter in a dark one, and the recess has to read the same way in both.

### Holding the message

Leave `value` unset and the dialog keeps the message, which is enough for a form that is submitted and forgotten. Pass `value` and `onValueChange` to hold it yourself — for a draft that survives the dialog being closed, or a field validated as it is typed.

`Submit` reads whichever one is in play, so it refuses an empty message either way. Empty feedback is worse than none: it is sent by somebody who believes they said something.

### The keyboard, and the caret

The dialog lifts clear of the keyboard on focus and settles back when it goes. It lifts by the overlap rather than travelling with the keyboard, because it is centred on the screen rather than pinned to an edge.

The caret is left to the platform. Every system draws its own accent there, and a field that overrides it is a field that looks like it belongs to a different phone.

### The well and the footer are slots

Neither is fixed. The well takes whatever the question needs — a rating, a row of tags, a confirmation — and the footer takes however many actions the step has, so it can collapse to one or swap Cancel for Back. The shell around them does not move while they change, which is what makes a dialog that answers you read as the same object rather than a second one arriving.

That is the reason `Submit` hands the message back instead of closing. Without it there is nothing on the other side of the press: no confirmation, and nowhere for a failed send to say so.

---

Full page, with every example: https://panelui.dev/docs/components/feedback
