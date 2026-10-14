# Marquee

Content that travels across its container on a loop.

```tsx
import { Marquee } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Marquee } from '@/components/ui/marquee';
```

### Anatomy

```tsx
<Marquee.Group>
  <Marquee>{topRow}</Marquee>
  <Marquee reverse>{bottomRow}</Marquee>
</Marquee.Group>
```

### Parts

- `Marquee.Group`

### Props

#### `MarqueeProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | **required** | The content to repeat. Measured once, then tiled along the axis. |
| `speed` | `number` | — | Travel speed in points per second. 40 by default, which is slow enough that a word stays readable as it crosses. The cycle time follows from this and the measured content, so longer content takes proportionally longer rather than moving faster. |
| `spacing` | `number` | `0` | Minimum gap between the end of one copy and the start of the next. |
| `direction` | `MarqueeDirection` | `horizontal` | Axis the content travels along. |
| `reverse` | `boolean` | `false` | Send it the other way: toward the start of the line, or upward. Applied after the reading direction, not instead of it. |
| `playing` | `boolean` | `true` | Set false to hold the content where it is. |
| `showPauseControl` | `boolean` | `true` | Show the built-in user pause/play control while motion is enabled. Defaults to `true` on its own, and to `false` inside a `Marquee.Group` — the group draws one control for everything in it, and a control per row is how two of them end up stacked on top of each other. |
| `pauseLabel` | `string` | `Pause` | Visible and spoken label for the moving state. |
| `playLabel` | `string` | `Play` | Visible and spoken label for the user-paused state. |
| `onPlayingChange` | `(playing: boolean) => void` | — | Reports changes made by the built-in control. |

#### `MarqueeGroupProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `playing` | `boolean` | `true` | Set false to hold every marquee in the group where it is. |
| `showPauseControl` | `boolean` | `true` | Show the group's pause/play control. |
| `pauseLabel` | `string` | `Pause` | Visible and spoken label for the moving state. |
| `playLabel` | `string` | `Play` | Visible and spoken label for the user-paused state. |
| `onPlayingChange` | `(playing: boolean) => void` | — | Reports changes made by the group's control. |
| `children` | `ReactNode` | — | — |

### Example — A strip of badges

The default: horizontal, travelling toward the end of the line at 40 points a second.

```tsx
<Marquee spacing={12} speed={40}>
  <View className="flex-row gap-3">
    {stack.map((label) => (
      <Badge key={label} variant="secondary">{label}</Badge>
    ))}
  </View>
</Marquee>
```

### Notes

**With the operating system set to reduce motion the content is rendered once and held still.** Not a slower loop — none. A ticker that never stops is the thing that setting exists to turn off.

A horizontal marquee travels toward the end of the line, so it reverses in a right-to-left subtree. `reverse` flips it again from wherever that leaves it.

**Pausing freezes the content where it is** and resuming carries on from there, so a name stopped mid-travel is still the name you stopped on.

**A marquee's track fills the row it is given rather than measuring one for itself, so give it a height wherever its container sizes to its contents.** A vertical marquee always needs one — it has no content width to take a height from. A horizontal marquee is fine inside a parent with room to give, but inside a container that sizes to what is in it there is nothing to fill: the content is clipped to nothing while the pause control below it still draws, which reads as a marquee that is one button and no marquee. Set the height the content is drawn at.

`speed` is points per second, so the cycle time follows from it and the measured content. Longer content takes proportionally longer rather than travelling faster, and two marquees at the same speed stay in step whatever is inside them. `spacing` is the minimum gap between copies. When a very short child would exceed the 32-copy mount budget, Marquee adds enough whitespace to preserve continuous coverage without mounting an unbounded number of subtrees. Non-finite speed values fall back to 40 points per second; negative or non-finite spacing is treated as zero, so invalid data cannot produce a non-finite animation or layout.

Screen readers and keyboard/pointer interaction are given one copy. Every repeated visual copy and the hidden measurement copy are inert, so an interactive child appears only once in focus and hit-testing order.

Motion includes a visible 48-point Pause/Play control by default, drawn **below** the content rather than over it. Over it, on a strip only as tall as a row of badges, the control was taller than the marquee — clipped by the track's own edge and sitting on the content it exists to let you read. So a marquee is now as tall as its content *plus* its control, and a container given a fixed height spends part of that height on it. Its labels can be localized with `pauseLabel` and `playLabel`; use `onPlayingChange` to observe the user choice. `playing={false}` remains the externally owned way to hold the content still, and suppresses the built-in control.

**Stacked rows go in a `Marquee.Group`.** A control per marquee means one control per row, and two rows of logos do not need two ways to stop one piece of motion. A group draws a single control for everything inside it, and the marquees in it stop drawing their own. Each one keeps its own `playing` prop: the group's pause is an additional hold, not a replacement.

Set `showPauseControl={false}` on a lone marquee only when an equivalent visible control exists elsewhere — a switch in the header that already governs `playing`, for instance. Inside a group it is already the default.

---

Full page, with every example: https://panelui.dev/docs/components/marquee
