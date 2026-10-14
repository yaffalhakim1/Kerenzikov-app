# ColorPicker

A colour chosen by dragging — a saturation square or a wheel, a hue scale, and opacity.

```tsx
import { ColorPicker } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { ColorPicker } from '@/components/ui/color-picker';
```

### Anatomy

```tsx
<ColorPicker presentation="popover">
  <ColorPicker.Trigger>
    <ColorPicker.Field label="Accent" />  {/* the row that opens it */}
  </ColorPicker.Trigger>
  <ColorPicker.Content>                   {/* …or no Trigger/Content at all, */}
    <ColorPicker.Swatches colors={[…]} /> {/* and the parts stack where they are */}
    <ColorPicker.Area />                  {/* …or <ColorPicker.Wheel /> */}
    <ColorPicker.Channel channel="hue" /> {/* the readout above a track */}
    <ColorPicker.Hue />
    <ColorPicker.Brightness />
    <ColorPicker.Alpha />
    <ColorPicker.Preview showValue />
  </ColorPicker.Content>
</ColorPicker>
```

### Variants

- **size** — `sm`, `md` *(default)*, `lg`
- **disabled** — `true`

### Parts

- `ColorPicker.Trigger` — What you press to open the picker, when `presentation` is not `inline`. Takes one element and clones it with an `onPress` — `ColorPicker.Field` is the obvious child, since it already reads out the colour it would let you change.
- `ColorPicker.Content` — The panel the controls are drawn in. It takes the trigger's width by default, floored so a narrow row cannot squeeze the square, and everything `Popover.Content` accepts works here too.
- `ColorPicker.Field` — The strip above the controls: what is being picked on the leading edge, what it currently is and a swatch of it on the trailing one. The value is built on the UI thread and only crosses to JavaScript when the rounded string changes, so a drag through a hundred frames of one hex costs one render.
- `ColorPicker.Area` — The square: saturation across it, brightness up it, under the current hue. The thumb sits centred on the colour it has picked rather than nudged inside the edge, so a fully saturated corner is reachable and looks reachable.
- `ColorPicker.Wheel` — The square bent into a circle — hue is the angle, saturation is the distance out. Interchangeable with `Area`: it reads the same channels, so a picker is a wheel *instead of* a square rather than as well as one. It carries no brightness, which is what `Brightness` is for.
- `ColorPicker.Channel` — The line above a track: the number on the leading edge, what it names on the trailing one. Degrees for hue, a percentage for the rest.
- `ColorPicker.Hue` — The hue scale, drawn as a gradient through the six corners of the colour wheel and back to red.
- `ColorPicker.Brightness` — Black to the current colour at full brightness. The square already carries brightness, so this is for pickers built around the wheel, which does not.
- `ColorPicker.Alpha` — Opacity, over a checkerboard that says *nothing here*. The ramp is a gradient used as a mask over a solid fill of the current colour, so changing the colour above never re-declares a gradient's props from React.
- `ColorPicker.Preview` — A swatch of the result, optionally with the colour written beside it. Takes children, for a copy button or a caption.
- `ColorPicker.Swatches` — Presets. Tapping one sets every channel at once, and the ring marks the one that is currently exact.

### Props

#### `ColorPickerProps`

Extends `Omit<ColorPickerVariantProps, 'disabled'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `string` | — | Controlled colour. Leave unset and pass `defaultValue` to run uncontrolled. |
| `defaultValue` | `string` | `#ff0000` | Starting colour when uncontrolled. |
| `onValueChange` | `(color: string) => void` | — | Fires on every frame of a drag — cheap updates only. The string is written in `format`. |
| `onValueCommit` | `(color: string) => void` | — | Fires once when a drag ends. The place for expensive side effects. |
| `format` | `ColorFormat` | `hex` | How the colour is written on the way out. `hex` gains an `#rrggbbaa` alpha pair, and the other two switch to their `a` forms, only when the colour is actually translucent. |
| `disabled` | `boolean` | `false` | — |
| `haptics` | `boolean` | `false` | A tick when a drag ends and when a preset is picked. Off by default — needs the optional `expo-haptics`, and is silent without it. There is no tick during a drag: a colour has no steps to cross, so a tick could only be a buzz proportional to speed. |
| `presentation` | `ColorPickerPresentation` | `inline` | How the controls get onto the screen. `inline` stacks them where they are written, and is the default. The other two put them behind a `ColorPicker.Trigger` and draw them in a `ColorPicker.Content` — which is the arrangement a colour usually wants, since a picker is a page's worth of controls in service of one value that is looked at far more often than it is changed. |
| `open` | `boolean` | — | Controlled open state of the panel. Ignored by `inline`. |
| `onOpenChange` | `(open: boolean) => void` | — | — |
| `children` | `ReactNode` | **required** | The parts, in the order they should stack. |

#### `ColorPickerTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactElement<{ onPress?: (...args: unknown[]) => void }>` | **required** | One element, cloned with an `onPress` that opens the panel. |

#### `ColorPickerAreaProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `height` | `number` | — | Height of the square in points. Defaults to the picker's size. |
| `thumbClassName` | `string` | — | Extra classes for the draggable thumb. |

#### `ColorPickerHueProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `thumbClassName` | `string` | — | Extra classes for the draggable thumb. |

#### `ColorPickerAlphaProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `thumbClassName` | `string` | — | Extra classes for the draggable thumb. |

#### `ColorPickerPreviewProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `showValue` | `boolean` | — | Print the colour beside the swatch, in the picker's `format`. The string is built on the UI thread and only crosses to JavaScript when it differs from the last one, so a drag that is not changing the rounded value costs nothing. |
| `swatchClassName` | `string` | — | Extra classes for the swatch. |
| `valueClassName` | `string` | — | Extra classes for the printed value. |
| `children` | `ReactNode` | — | Anything to put after the value — a copy button, a label. |

#### `ColorPickerSwatchesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `colors` | `string[]` | **required** | The presets, in any format `ColorPicker` can read. |
| `swatchSize` | `number` | — | Diameter of one swatch in points. Defaults to the picker's size. |
| `swatchClassName` | `string` | — | Extra classes for one swatch. |

#### `ColorPickerFieldProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `label` | `string` | — | What the colour is for — "Accent", "Background", a layer name. |
| `showValue` | `boolean` | — | Print the current colour beside the swatch, in the picker's `format`. On by default: the strip exists to say what the colour *is*, and a swatch alone cannot be read out, copied down or typed into a design tool. |
| `swatchClassName` | `string` | — | Extra classes for the swatch. |
| `onPress` | `(...args: unknown[]) => void` | — | Makes the strip pressable, and a button to a screen reader. Mostly you do not pass this yourself: `ColorPicker.Trigger` clones the strip with one, which is what turns the row into the thing that opens the picker. |
| `children` | `ReactNode` | — | Anything to put after the swatch — a copy button, a reset. |

#### `ColorPickerChannelProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `channel` | `ColorPickerChannel` | **required** | Which channel to read. |
| `label` | `string` | — | Overrides the channel's own name. |
| `format` | `(value: number) => string` | `hex` | Writes the number yourself. Receives degrees for `hue` and a percentage for the other three, both already rounded. |

#### `ColorPickerBrightnessProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `thumbClassName` | `string` | — | Extra classes for the draggable thumb. |

#### `ColorPickerWheelProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `size` | `number` | `md` | Diameter in points. Defaults to the picker's size. |
| `thumbClassName` | `string` | — | Extra classes for the draggable thumb. |

### Example — Folded away behind the row

A picker is a page's worth of controls in service of one value, and that value is read far more often than it is changed. `presentation` puts the controls behind the row that reads it out, so two colours cost two rows rather than two panels. `bottom-sheet` is the same arrangement brought up from the bottom edge instead.

```tsx
<ColorPicker value={accent} onValueChange={setAccent} presentation="popover">
  <ColorPicker.Trigger>
    <ColorPicker.Field label="Accent" />
  </ColorPicker.Trigger>
  <ColorPicker.Content>
    <ColorPicker.Area height={220} />
    <ColorPicker.Channel channel="hue" />
    <ColorPicker.Hue />
  </ColorPicker.Content>
</ColorPicker>
```

### Notes

Runs controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`). Both read `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`, `hsl()` and `hsla()`; a string the picker cannot read leaves it on the colour it already has, rather than snapping to black.

`ColorPicker.Preview`'s printed value is built on the UI thread and only crosses to JavaScript when it differs from the last one, so a drag that is not changing the rounded value costs nothing.

The square is adjustable to a screen reader in both axes: increment and decrement move saturation, and a **Brighter** / **Darker** pair moves brightness. Hue and opacity are adjustable on their own. Their spoken values update when a drag ends rather than during it — nobody is listening to the middle of a gesture, and a value that re-announced every frame would be a hundred announcements for one drag.

The conversion helpers the picker is built on are exported too — `parseColor`, `formatColor`, `hsvToHex`, `hsvToRgb`, `rgbToHsv`, `hsvToHsl`, `hsvToCss` and `isValidColor`. Every one is a worklet, so they can be called from an animated style as well as from ordinary code.

### The wheel, and what it cannot carry

A square holds two channels because it has two axes. A wheel holds two as well — an angle and a radius — so swapping one for the other trades brightness for a shape, not for a third channel. `ColorPicker.Brightness` is the track that takes it back; a wheel without one can only pick colours at full brightness.

The wheel is deliberately **not mirrored under RTL**, unlike the square and the tracks. Those have a start and an end, so they have a direction to be read in. A wheel has neither: reversing which way round the spectrum runs would move every colour somewhere else without making any of them easier to find.

There is no conic gradient to draw a hue ring with, so it is approximated by 120 solid wedges given a hair of overlap — three degrees each is under a pixel of colour step at any size this is drawn at, and the overlap stops the seams reading as lighter spokes. The ring is built once at module scope: it is the same wheel in every picker.

---

Full page, with every example: https://panelui.dev/docs/components/color-picker
