# AIInput

A prompt composer: a field that grows to five lines, a row of controls, and the sheet they open.

```tsx
import { AIInput } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { AIInput } from '@/components/ui/ai-input';
```

### Anatomy

```tsx
<AIInput>
  <AIInput.Field />
  <AIInput.Toolbar>
    <AIInput.Action />
    <AIInput.Pill />
    <AIInput.Spacer />
    <AIInput.Submit />
  </AIInput.Toolbar>
  <AIInput.Recording />
</AIInput>

<AIInput.Sheet>
  <AIInput.Sheet.Screen id="root" title="Add to chat">
    <AIInput.Sheet.Group>
      <AIInput.Sheet.Row />
      <AIInput.Sheet.Toggle />
      <AIInput.Sheet.Choice />
    </AIInput.Sheet.Group>
  </AIInput.Sheet.Screen>
</AIInput.Sheet>

<AIInput.VoiceMode />
```

### Variants

- **size** — `sm`, `md` *(default)*, `lg`
- **disabled** — `true`, `false` *(default)*

### Parts

- `AIInput.Screen`
- `AIInput.Group`
- `AIInput.Row` — The field and its controls on a single line, instead of the field above them. The composer at its smallest — a bar that is always on screen rather than the focus of it.
- `AIInput.Toggle`
- `AIInput.Choice`

### Props

#### `AIInputProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |
| `className` | `string` | — | — |
| `value` | `string` | — | The prompt, when the app owns it. |
| `onValueChange` | `(value: string) => void` | — | Called on every keystroke. |
| `defaultValue` | `string` | `` | The prompt to start with, when the composer owns it. |
| `status` | `AIInputStatus` | `ready` | What the app is doing. `ready` offers to send, `streaming` offers to stop, and `recording` swaps the toolbar for the meter and its two decisions. |
| `onSubmit` | `(value: string) => void` | — | Called with the prompt when it is sent. The composer does not clear itself. |
| `onStop` | `() => void` | — | Called when the trailing button is pressed while `streaming`. |
| `onVoice` | `() => void` | — | Called when the voice button is pressed on an empty composer. |
| `onRecordCancel` | `() => void` | — | Called when a recording is thrown away. |
| `onRecordConfirm` | `() => void` | — | Called when a recording is accepted. |
| `level` | `number \| SharedValue<number>` | — | Input level, 0–1, from the app's own recorder. Pass a shared value to keep metering off the JS thread entirely. Omitted, the meter animates plausible motion so a screen can be built before any audio exists. |
| `size` | `AIInputSize` | `md` | Type scale and control size. |
| `disabled` | `boolean` | `false` | Nothing can be typed, pressed or sent. |
| `native` | `boolean` | `false` | Draw the toolbar's controls as the platform's own buttons, in the system material — Liquid Glass on iOS 26, the platform's ordinary button style below it and on Android. The platform owns their colour, metrics and shape when this is on, so `className` and the theme tokens no longer reach them. The card behind them is still ours, and still glass. Needs the optional `@expo/ui`; without it the drawn controls are used and nothing breaks. |
| `minRows` | `number` | `1` | Rows the empty field is tall. |
| `maxRows` | `number` | `5` | Rows the field grows to before it holds that height and scrolls. |
| `avoidKeyboard` | `boolean` | `true` | Lift the composer clear of the software keyboard. |
| `keyboardBottomInset` | `number` | `0` | How far above the bottom edge the composer already sits. |
| `keyboardGap` | `number` | `8` | Gap to leave between the composer and the top of the keyboard. A composer resting directly on the keys reads as part of them. |

#### `AIInputFieldProps`

Extends `Omit<TextInputProps, 'value' \| 'onChangeText' \| 'multiline'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `AIInputRowProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `AIInputToolbarProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `AIInputActionProps`

Extends `Omit<ViewProps, 'children'>, Pick<ViewProps, 'accessibilityHint'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `label` | `string` | **required** | Names the control. It is a circle with a glyph in it; nothing else says what it does. |
| `icon` | `ReactNode` | **required** | — |
| `onPress` | `() => void` | — | — |
| `disabled` | `boolean` | `false` | — |
| `size` | `AIInputSize` | `md` | Control size. Inherited from the composer when it is inside one. |
| `native` | `boolean` | `false` | Draw it as the platform's own button, in the system material. Inherited from the composer when it is inside one. The platform owns its colour and shape, so `className` stops reaching it. |

#### `AIInputPillProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `label` | `ReactNode` | **required** | The current value — a model name, a mode, a project. |
| `detail` | `ReactNode` | — | A second, quieter value beside it. |
| `indicator` | `ReactNode` | — | A glyph after the labels, for a pill that opens a list. |
| `indicatorSymbol` | `string` | — | The platform's name for `indicator`, used when the pill is handed over. A native button takes a glyph as a name from the system's symbol set, not as an element — an element would have to be hosted, and a hosted view inside a labelled button has no width anything can resolve. So the two are separate props rather than one: `indicator` is what the drawn pill renders, this is what the handed-over one asks the platform for. A pill with an `indicator` and no symbol is still handed over, and has no glyph on it. |
| `onPress` | `() => void` | — | — |
| `disabled` | `boolean` | `false` | — |
| `accessibilityLabel` | `string` | — | Names the control when the label alone does not say what changing it does. |
| `size` | `AIInputSize` | `md` | Control size. Inherited from the composer when it is inside one. |
| `native` | `boolean` | `false` | Draw it as the platform's own button, in the system material. The platform is given text and a symbol name, never elements: a hosted view inside a labelled native button has no width anything can resolve. So a `label` or `detail` that is not a string is drawn here whatever this says, and an `indicator` reaches the platform only through `indicatorSymbol`. A handed-over pill is one label in the platform's own type, so `detail` stops reading as the quieter half of the pair. |

#### `AIInputSubmitProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `sendLabel` | `string` | `Send` | Names the button in its send state. |
| `voiceLabel` | `string` | `Voice mode` | Names it in its voice state, which is what an empty composer offers. |
| `stopLabel` | `string` | `Stop` | Names it while the model is answering. |
| `native` | `boolean` | `false` | Draw it as the platform's own button, in the system material. |

#### `AIInputRecordingProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `cancelLabel` | `string` | `Discard recording` | — |
| `confirmLabel` | `string` | `Use recording` | — |
| `native` | `boolean` | `false` | Draw the two decisions as the platform's own buttons. |

#### `AIInputSheetScreenProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `id` | `string` | **required** | Names this screen. `AIInput.Sheet.Row`'s `to` pushes the screen with this id. |
| `title` | `ReactNode` | — | Centred in the header, and the first thing a screen reader reaches. |
| `trailing` | `ReactNode` | — | A control at the trailing end of the header — a second action the screen offers. The leading end is the sheet's, and is a close button on the root screen and a back button on every screen pushed onto it. |

#### `AIInputSheetProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |
| `className` | `string` | — | — |
| `open` | `boolean` | — | — |
| `onOpenChange` | `(open: boolean) => void` | — | — |
| `defaultOpen` | `boolean` | `false` | — |
| `initialScreen` | `string` | — | Which screen opens first. Defaults to the first one given. |
| `onScreenChange` | `(id: string) => void` | — | Called whenever the screen on top changes, pushed or popped. |
| `blur` | `boolean` | `false` | Frost the screen behind the sheet instead of dimming it. |
| `size` | `'auto' \| 'half' \| 'full'` | `md` | How tall the sheet opens. `auto` sizes to the screen currently on top. |
| `detached` | `boolean` | `true` | Float the sheet clear of the screen edges instead of docking it to the bottom. On by default: the surface is a material, and a material reads as laid over the app when there is app visible around all four of its edges. Docked, its bottom edge is the screen's, and there is nothing behind it there to refract. |

#### `AIInputSheetGroupProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `footnote` | `ReactNode` | — | A line under the group, for what the rows in it mean. |

#### `AIInputSheetRowProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `label` | `ReactNode` | **required** | — |
| `description` | `ReactNode` | — | A quieter line under the label. |
| `icon` | `ReactNode` | — | A glyph at the leading end. |
| `value` | `ReactNode` | — | The current setting, shown at the trailing end. |
| `to` | `string` | — | Push the screen with this id when the row is pressed. A row with one shows a chevron, because a row that leads somewhere should say so before it is pressed. |
| `onPress` | `() => void` | — | — |
| `disabled` | `boolean` | `false` | — |

#### `AIInputSheetToggleProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `label` | `ReactNode` | **required** | — |
| `description` | `ReactNode` | — | — |
| `icon` | `ReactNode` | — | — |
| `value` | `boolean` | **required** | — |
| `onValueChange` | `(value: boolean) => void` | — | — |
| `disabled` | `boolean` | `false` | — |

#### `AIInputSheetChoiceProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `label` | `ReactNode` | **required** | — |
| `description` | `ReactNode` | — | — |
| `badge` | `ReactNode` | — | A pill beside the label — what the choice costs, or what it needs. |
| `selected` | `boolean` | `false` | — |
| `onPress` | `() => void` | — | — |
| `disabled` | `boolean` | `false` | — |

#### `AIInputVoiceModeProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | The controls in the bottom row, before the close button. |
| `state` | `'idle' \| 'listening' \| 'thinking' \| 'speaking'` | `listening` | What the app is doing, which is what the wave behind everything shows. |
| `level` | `number \| SharedValue<number>` | — | Input level, 0–1. A shared value keeps metering off the JS thread. |
| `title` | `ReactNode` | — | A line above the microphone — a greeting, or what it is waiting for. |
| `onMicPress` | `() => void` | — | — |
| `micLabel` | `string` | `Mute` | — |
| `onClose` | `() => void` | — | — |
| `closeLabel` | `string` | `End voice mode` | — |
| `size` | `AIInputSize` | `md` | Type scale for the controls in the bottom row. |
| `native` | `boolean` | `false` | Draw the bottom row's controls as the platform's own, in its material. |

### Example — Growing, and then scrolling

`maxRows` is where the field stops. Up to it the composer follows the text; past it the height holds and the field scrolls, which is what keeps the toolbar on screen.

`minRows` moves the floor if a composer should open taller than one line.

```tsx
<AIInput value={value} onValueChange={setValue} maxRows={5}>
  <AIInput.Field placeholder="Ask anything" />
  <AIInput.Toolbar>
    <AIInput.Spacer />
    <AIInput.Submit />
  </AIInput.Toolbar>
</AIInput>
```

### Notes

**The field stops at `maxRows` and scrolls.** The toolbar stays at the bottom of the box, so a long prompt never pushes the send button off the screen.

**The trailing button is inert when there is nothing to do.** With no text it offers voice mode, and only if the app took an `onVoice`; without one it stays disabled until something is typed, rather than looking live and doing nothing. The same goes for `onStop` while streaming.

**`onSubmit` does not clear the field.** The composer does not know whether the send succeeded; clear `value` yourself once it has.

**Glass needs iOS 26.** Everywhere else the surfaces are solid, which is a finished look rather than a fallback. Nothing is faked on Android.

**A `native` row is the platform's height, not ours.** A control handed over is hosted, and a hosted view only lays out where something above it is fixed on both axes. The platform frames its icon buttons at 44pt, so a row carrying them takes a definite height of its own — a shorter row is one its controls hang out of, over the field above them. The drawn controls are smaller and are laid out by the row itself, so this applies only once `native` is on.

**`avoidKeyboard` is a component boundary, not a flag.** Turning it off means the keyboard hook is never called at all — calling it has global consequences, and a composer that was told not to avoid the keyboard must not impose that on every other screen.

**The sheet is a solid surface, not a material.** It covers most of the screen, so there is almost nothing behind it left to refract. The composer keeps the glass, because a bar floating over a page is the case the material is for.

**A sheet row's `to` names a screen id, not a route.** It pushes onto the same sheet; nothing navigates.

---

Full page, with every example: https://panelui.dev/docs/ai-components/ai-input
