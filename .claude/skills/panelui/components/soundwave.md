# Soundwave

What a voice looks like while an app listens.

```tsx
import { Soundwave } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Soundwave } from '@/components/ui/soundwave';
```

### Usage

```tsx
<Soundwave variant="pills" state="listening" level={level} />
```

### Props

#### `SoundwaveProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `variant` | `SoundwaveVariant` | `pills` | Which look to draw: `pills` for a few capsules over a microphone button, `bars` for a metering strip, `line` for a travelling wave, `ambient` for a glow that fills its parent. |
| `state` | `SoundwaveState` | `listening` | What the app is doing. With no `level` supplied this picks the motion the wave runs on its own; it always sets what a screen reader announces. |
| `level` | `number \| SharedValue<number>` | — | Input level, 0–1, from your own recorder's metering. Pass a `SharedValue` to keep updates off the JS thread entirely. Omit it and the wave animates plausible motion for the current `state`. |
| `levels` | `number[]` | — | Per-band levels, 0–1 each, for `bars` in `static` mode when the app has a real frequency analysis — or the stored shape of a finished recording. Resampled to the bar count, and drawn still rather than animated. |
| `progress` | `number \| SharedValue<number>` | — | Playback position through a recording, 0–1. Bars behind it keep full ink and the rest are dimmed, which is the voice-note progress bar. `bars` only, and it goes with `levels` — a recording has a fixed shape to play through. |
| `bars` | `number` | — | How many capsules (`pills`) or bars (`bars`) to draw. |
| `barWidth` | `number` | — | Capsule width, or bar stroke width. Also the stroke width of `line`. |
| `barGap` | `number` | — | Gap between capsules. `bars` spaces itself evenly across the width. |
| `height` | `number` | — | Drawing height. `ambient` ignores it and fills its parent. |
| `mode` | `'static' \| 'scrolling'` | `static` | `static` gives every bar a band of the current level; `scrolling` keeps a history that slides across, newest at the trailing edge. `bars` only. |
| `centered` | `boolean` | `true` | Grow bars from the middle out rather than up from the baseline. |
| `fadeEdges` | `boolean` | — | Fade the wave out at both ends, so it does not stop at a hard edge. |
| `sensitivity` | `number` | `1` | Multiplier on the incoming level, applied before it is clamped to 1. |
| `speed` | `number` | `1` | Multiplier on the wave's own tempo, including how fast history scrolls. |
| `color` | `string` | — | Ink. Takes a colour — `#f97316`, `rgba(…)` — or a **theme token name**, `color="--color-info"`, which resolves against the active theme and follows it into dark mode. Left unset, a wave inside a surface that publishes a foreground (a chat bubble, a button) is drawn in that foreground, and anywhere else in `--color-foreground` — or `--color-info` for `ambient`. |
| `gradient` | `readonly string[]` | — | Colour across the wave instead of one flat ink: two or more colours spread left to right, or ramped up from the bottom edge for `ambient`. Literal colours only — for a themed one, resolve the tokens with `useCSSVariable` and pass the result. |
| `trackColor` | `string` | — | Colour of the part of a recording that has not played yet. Defaults to the ink at low opacity, which is right for most surfaces; set it when you want the track to read as its own thing. `bars` with `progress`. |
| `paused` | `boolean` | `false` | Freeze on the current frame. |
| `radius` | `number` | `44` | Corner radius `ambient` traces. Match it to the screen it sits on. |
| `accessibilityLabel` | `string` | — | Overrides the per-state default announced to screen readers. |

### Example — Driving it from a recorder

A recorder reports every 30–60ms. Putting that in React state is dozens of renders a second for a number that only moves pixels, so `level` also takes a `SharedValue` — write metering straight into it and nothing above the wave re-renders. A plain number is accepted too, and smoothed identically; it is the right choice for something slow, like a server-side speaking flag.

```tsx
const level = useSharedValue(0);

useEffect(() => {
  recorder.onMetering(({ db }) => {
    // dBFS is negative and logarithmic; the wave wants 0–1.
    level.value = Math.max(0, (db + 60) / 60);
  });
}, [level]);

<Soundwave variant="pills" level={level} />
```

### Notes

**Nothing here touches the microphone.** Recording, permissions and the audio session stay in your app; this takes the number that falls out of them. There is a full walkthrough in [Voice](/docs/ai/voice) — metering, an assistant loop, and voice notes.

Levels are smoothed with a fast attack and a slow release, which is what makes a meter read as a meter — it snaps up on a syllable and falls back gently instead of chattering around every sample. `sensitivity` multiplies the incoming value before it is clamped, for a quiet source.

**Ink follows the surface.** A wave inside something that publishes a foreground — a chat bubble, a button — is drawn in that foreground rather than the page's, because a sent bubble is painted in the primary colour and in most themes the primary colour *is* the text colour. `ambient` opts out: it is a glow behind a screen, not ink on a surface.

Anything above that is a prop: `color` (a colour or a theme token name), `gradient` across the wave, and `trackColor` for the unplayed part of a recording. Only `gradient` needs literal colours — resolve tokens with `useCSSVariable` if you want a themed one.

`bars` and `line` are drawn as a single animated SVG path — one segment per bar with a round cap — so forty bars cost one animated prop a frame rather than forty animated views. With `progress` it is two: one for the played part, one for the rest. Both measure their own width, so they need a parent with one.

`paused` and the system's reduced-motion setting both hold a representative frame rather than clearing to a flat line: a stopped wave is not an empty one.

---

Full page, with every example: https://panelui.dev/docs/ai-components/soundwave
