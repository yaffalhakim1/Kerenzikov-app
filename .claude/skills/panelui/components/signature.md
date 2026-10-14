# Signature

Sign with a finger, and get the result back out as SVG or PNG.

```tsx
import { Signature } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Signature } from '@/components/ui/signature';
```

### Anatomy

```tsx
<Signature ref={pad} />
<Signature.Toolbar>
  <Signature.Undo onPress={() => pad.current?.undo()} />
  <Signature.Redo onPress={() => pad.current?.redo()} />
  <Signature.Clear onPress={() => pad.current?.clear()} />
</Signature.Toolbar>
```

### Variants

- **size** — `sm`, `md` *(default)*, `lg`, `full`
- **disabled** — `true`

### Parts

- `Signature.Toolbar` — A row of controls under or over the pad. Purely layout.
- `Signature.Undo` — Round button for removing the last stroke. Wire it to `ref.current?.undo()`.
- `Signature.Redo` — Round button for putting back the last undone stroke. Wire it to `ref.current?.redo()`.
- `Signature.Clear` — Round button for dropping every stroke. Wire it to `ref.current?.clear()`.

### Props

#### `SignatureProps`

Extends `Omit<ViewProps, 'children'>, Omit<SignatureVariantProps, 'disabled'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `size` | `'sm' \| 'md' \| 'lg' \| 'full'` | `md` | How tall the pad is. `full` fills its parent instead. |
| `strokeColor` | `string` | — | Ink colour. Defaults to the theme's foreground. |
| `strokeWidth` | `number` | `2.5` | Ink width in points. |
| `minDistance` | `number` | `1.5` | Points closer together than this are dropped as they arrive, so a finger resting still does not add hundreds of points describing one spot. |
| `guideline` | `boolean` | `false` | Draw the baseline and its ✕ mark, the way a paper form does. |
| `guidelineLabel` | `string` | — | Caption beside the baseline. Only shown with `guideline`. |
| `placeholder` | `ReactNode` | — | Prompt shown over an empty pad. Pass `null` for none. |
| `disabled` | `boolean` | `false` | Take no input. The strokes already there stay visible. |
| `onRequestAlternative` | `() => void` | — | Opens a product-provided non-drawing method, such as typing a legal name, uploading an image, or asking for assisted signing. Exposed as a screen reader action; provide the same choice as a visible control too. |
| `onBegin` | `() => void` | — | A stroke has started. |
| `onEnd` | `() => void` | — | A stroke has finished. |
| `onChange` | `(strokeCount: number) => void` | — | The number of committed strokes changed — by drawing, undoing, redoing or clearing. The cheap way to enable a Save button only once something is there to save. |
| `padClassName` | `string` | — | Class on the drawing surface inside the border. |
| `placeholderClassName` | `string` | — | Class on the empty-pad prompt. |
| `guideClassName` | `string` | — | Class on the baseline. |

#### `SignatureToolbarProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `SignatureButtonProps`

Extends `Omit<AnimatedPressableProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `disabled` | `boolean` | `false` | Take no input, and dim to say so. |
| `children` | `ReactNode` | — | Replaces the default icon. |

### Example — A pad with its controls

`onChange` reports the stroke count, which is the cheap way to keep a Save button disabled until there is something to save.

```tsx
const pad = useRef<SignatureHandle>(null);
const [count, setCount] = useState(0);

<Signature ref={pad} onChange={setCount} />
<Signature.Toolbar>
  <View className="flex-row gap-2">
    <Signature.Undo disabled={count === 0} onPress={() => pad.current?.undo()} />
    <Signature.Clear disabled={count === 0} onPress={() => pad.current?.clear()} />
  </View>
  <Button disabled={count === 0} onPress={submit}>Done</Button>
</Signature.Toolbar>
```

### Notes

### Why the stroke never reaches React

A finger produces touch events far faster than a component tree can usefully re-render, and a signature is exactly where the lag shows: the line trails the fingertip and drawing feels like moving through syrup.

So the stroke being drawn lives in a shared value and is turned into an SVG path by a worklet on the UI thread — React is not involved in a single frame of it. When the finger lifts, that one finished string crosses to JavaScript once and becomes a static path. Committed strokes never animate again, so the hundredth stroke costs what the first one did.

Points closer together than `minDistance` are dropped as they arrive. A finger resting still otherwise emits a point per frame in the same spot, which is a longer path describing the same shape.

### Smoothing

Raw touch points joined with straight lines look like a seismograph. Each segment is drawn as a quadratic curve through the midpoint between two points instead: the point itself is the control handle, the midpoints are the anchors, and consecutive curves meet with a shared tangent. It needs no lookahead, so a point can be appended to a stroke already on screen without redrawing what came before it differently.

### Getting the signature out

The ref exposes `clear`, `undo`, `redo`, `isEmpty`, `strokeCount`, `toSVG`, `toDataURL` and `save`.

`toSVG()` is pure string building — no packages, no async, nothing written to disk — and returns a standalone document sized to the pad. It is the one to reach for when the signature is going into an API call or a database record.

`save()` writes a file and resolves `{ uri, format, width, height }`. It needs the optional `expo-file-system`. Passing `format: 'png'` rasterises the pad and also needs the optional `react-native-view-shot`. Neither is installed on your behalf, and asking for something a missing package provides throws with that package's name in the message rather than failing somewhere further down.

```tsx
const file = await pad.current?.save({ filename: 'agreement', format: 'png', scale: 3 });
```

`directory` defaults to the app's own document directory, which survives restarts and is not visible to the user. Pass one explicitly to write anywhere else.

---

Full page, with every example: https://panelui.dev/docs/components/signature
