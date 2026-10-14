# QRCode

A string a camera can read — framed, titled, or folded away behind a button.

```tsx
import { QRCode } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { QRCode } from '@/components/ui/qr-code';
```

### Anatomy

```tsx
<QRCode value="…" presentation="popover">
  <QRCode.Trigger>                      {/* …or no Trigger/Content at all, */}
    <Button>Show the code</Button>      {/* and the parts draw where they are */}
  </QRCode.Trigger>
  <QRCode.Content>
    <QRCode.Frame>                      {/* the tray */}
      <QRCode.Header>                   {/* the strip across the top of it */}
        <QRCode.Title>Pair a device</QRCode.Title>
        <QRCode.Action>Expires in 5m</QRCode.Action>
      </QRCode.Header>
      <QRCode.Panel>                    {/* the card the code is drawn on */}
        <QRCode.Canvas />               {/* the code itself */}
        <QRCode.Logo>…</QRCode.Logo>    {/* clears a square in the middle */}
      </QRCode.Panel>
    </QRCode.Frame>
    <QRCode.Caption>Scan to open the docs</QRCode.Caption>
    <QRCode.Value />                    {/* the string, for anyone who cannot scan */}
  </QRCode.Content>
</QRCode>
```

### Variants

- **size** — `sm`, `md` *(default)*, `lg`

### Parts

- `QRCode.Canvas` — The code. Dark modules on a light plate whatever the theme is doing — see the note below, because that is the one place in the library that ignores the tokens and it is on purpose. `pixelSize` sets the side length. `moduleShape`, `eyeFrameShape` and `eyeBallShape` change the geometry; `color`, `eyeFrameColor`, `eyeBallColor` and `backgroundColor` change the ink.
- `QRCode.Frame` — The tray the code sits in — the same widget shell the charts use, with a titled strip over a card flush inside it.
- `QRCode.Header` — The strip across the top of the tray. `QRCode.Title` takes the flexible side, `QRCode.Action` the end.
- `QRCode.Title` — What the code is for. Muted and one line — it is a caption on the tray, not a heading.
- `QRCode.Action` — The trailing slot on the header row: an expiry, a count, a button. A plain string draws as muted text.
- `QRCode.Panel` — The card the code is drawn on, flush inside the tray. It is also what `QRCode.Logo` positions against, so the logo belongs in here beside the canvas.
- `QRCode.Description` — A muted line inside the panel, under the code.
- `QRCode.Caption` — A line under the whole thing saying what scanning it does.
- `QRCode.Value` — The encoded string, selectable, on one line unless you pass `full`. For someone who cannot scan — which includes the person setting up the camera.
- `QRCode.Logo` — Content for a cleared square in the middle of the code. Its presence is what clears the square, and what raises the error-correction level when the one asked for could not afford the loss.
- `QRCode.Trigger` — What opens a `popover` or `bottom-sheet` code. Its child has to accept `onPress`.
- `QRCode.Content` — The panel the code is drawn in when it is not drawn in place. Everything `Popover.Content` accepts works here too.

### Props

#### `QRCodeProps`

Extends `Omit<ViewProps, 'children'>, QrCodeVariantProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `string` | **required** | What the code encodes. Anything: a URL, a WiFi string, a vCard. Encoded as UTF-8, and the version grows to fit it. |
| `errorCorrection` | `ErrorCorrectionLevel` | `M` | How much of the code can be lost and still read — `L` about 7%, `M` 15%, `Q` 25%, `H` 30%. More correction means a denser code at the same size, so `M` is the default. Raised automatically when a `QRCode.Logo` needs it. |
| `version` | `number` | — | Fix the QR version, 1–40, instead of taking the smallest that fits. Worth setting when the content changes and the code should not visibly change density with it. |
| `presentation` | `QRCodePresentation` | `inline` | Where the code appears. `inline` draws it where it sits; the other two put it behind a `QRCode.Trigger` and draw it in a `QRCode.Content`. |
| `open` | `boolean` | — | Controlled open state. Ignored while `presentation` is `inline`. |
| `onOpenChange` | `(open: boolean) => void` | — | — |
| `children` | `ReactNode` | — | — |

#### `QRCodeCanvasProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `pixelSize` | `number` | — | Side length in points. Defaults to the size variant's. |
| `color` | `string` | — | Dark modules. See the note below before overriding this. |
| `backgroundColor` | `string` | — | The plate the modules sit on. See the note below. |
| `moduleShape` | `QRCodeModuleShape` | `square` | How a data module is drawn. `rounded` and `classy` join to their neighbours — a corner is rounded only where both cells touching it are light — so a run reads as one stroke rather than as a string of beads with a light seam through it. `dot` and `diamond` do not tile, and cost read distance for it: `dot` covers about two thirds of its cell and `diamond` exactly half, so the same code is a fainter code at the same size. Raise `errorCorrection` with them, and check a printed one rather than a screen. |
| `eyeFrameShape` | `QRCodeEyeFrameShape` | `square` | How the ring around each of the three corner eyes is drawn. |
| `eyeBallShape` | `QRCodeEyeBallShape` | `square` | How the square inside each corner eye is drawn. |
| `eyeFrameColor` | `string` | — | The three corner rings. Defaults to `color`. |
| `eyeBallColor` | `string` | — | The three corner centres. Defaults to `eyeFrameColor`, then `color`. |

#### `QRCodeFrameProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `QRCodeHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `QRCodeTitleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `QRCodeActionProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `QRCodePanelProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `QRCodeDescriptionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `QRCodeCaptionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `QRCodeValueProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `full` | `boolean` | — | Show the whole string rather than one line of it. |

#### `QRCodeLogoProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `QRCodeTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactElement<{ onPress?: (...args: unknown[]) => void }>` | **required** | The element that opens it. Must accept `onPress`. |

### Example — In a frame

The tray, its title strip, and a line under the whole thing.

```tsx
<QRCode value="https://panelui.dev" size="lg">
  <QRCode.Frame>
    <QRCode.Header>
      <QRCode.Title>Documentation</QRCode.Title>
      <QRCode.Action>panelui.dev</QRCode.Action>
    </QRCode.Header>
    <QRCode.Panel>
      <QRCode.Canvas />
    </QRCode.Panel>
  </QRCode.Frame>
  <QRCode.Caption>Scan to open the docs</QRCode.Caption>
</QRCode>
```

### Notes

The encoding is byte mode, so `value` can be anything — a URL, a WiFi string, a vCard, Japanese. It is encoded as UTF-8, which every reader in circulation understands.

The QR **version** — the module count, 21×21 up to 177×177 — is chosen as the smallest that fits what you passed. That means a code visibly gets denser as its content grows, which is usually what you want and occasionally is not: pass `version` to pin it, and the component will tell you at runtime if the content stops fitting.

### Error correction, and what it is for

`errorCorrection` decides how much of the code can be lost and still read: `L` about 7%, `M` 15% (the default), `Q` 25%, `H` 30%. The correction is not free — the redundancy takes modules, so a higher level is a denser code at the same physical size, and a denser code is one a camera has to get closer to.

`M` is the default because a code on a screen is not being damaged by anything. Raise it when the code will be printed, put on something curved, or covered in the middle — and a `QRCode.Logo` raises it for you if the level you asked for could not afford the square it clears.

### Shape and colour, without breaking it

A reader does two things, and both survive every shape here.

It **finds** a code by the three corner eyes — by the 1:1:3:1:1 run of dark and light through the middle of one — which holds while the eye is exactly seven modules across. Every `eyeFrameShape` is, and the shapes that are not symmetric turn to face outwards so all three read the same way round.

It **reads** each module by sampling the centre of that module's cell. Every `moduleShape` keeps that centre dark and stays inside its own cell, so a shaped module reads exactly as a square does.

What a shape does cost is **ink**. `dot` covers about two thirds of its cell and `diamond` exactly half, so the same code at the same size is a fainter one, read from closer. Raise `errorCorrection` when you shape a code, and check a printed one rather than one on a screen — a display is backlit and paper is not.

### Making it scannable

Three things decide whether a code reads, and none of them is the code:

- **The quiet zone.** Four modules of clear space all round, which `QRCode.Canvas` draws and paints. Do not clip it, and do not put the code flush against a border.
- **Contrast, the right way round.** Dark modules on a light field, and `QRCode.Canvas` draws that way whatever the theme is doing. It is the one thing in the library that ignores the tokens, and it is deliberate: inverted, a code is rejected outright by a good share of scanners and found late by most of the rest, which turns a dark theme into a bug report about a code that "sometimes does not work". On a light theme the plate is white on a near-white card and reads as nothing at all, which is the intended outcome. `color`, `eyeFrameColor`, `eyeBallColor` and `backgroundColor` override the ink and the plate — but not the rule: keep the plate light and the ink dark, whatever the hue.
- **Size.** A code needs roughly one point per module at arm's length. `sm` is 128 points, which is fine for a version 2 code and marginal for a version 10 one; `lg` is 240.

### Accessibility

The canvas has an image role and a label naming what it encodes, so a screen reader announces the destination rather than "image". `QRCode.Value` puts the same string on screen as selectable text, which is the way through for anyone whose camera is the thing being set up.

---

Full page, with every example: https://panelui.dev/docs/components/qr-code
