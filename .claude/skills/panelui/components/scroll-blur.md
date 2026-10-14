# ScrollBlur

Blurs the edges of a scroll container.

```tsx
import { ScrollBlur } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { ScrollBlur } from '@/components/ui/scroll-blur';
```

### Usage

```tsx
<ScrollBlur size={64}>
  <ScrollView showsVerticalScrollIndicator={false}>
    {rows.map((row) => (
      <Item key={row.id}>
        <Item.Content>
          <Item.Title>{row.name}</Item.Title>
          <Item.Description>{row.summary}</Item.Description>
        </Item.Content>
      </Item>
    ))}
  </ScrollView>
</ScrollBlur>
```

### Props

#### `ScrollBlurProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `size` | `number` | `80` | Depth of the blurred band in pixels. |
| `edges` | `'both' \| 'start' \| 'end' \| 'none'` | `both` | Which edges blur. |
| `orientation` | `'horizontal' \| 'vertical'` | — | Scroll axis. Inferred from the child's `horizontal` prop when omitted — pass it explicitly for children that scroll horizontally without that prop (a `FlatList` with `horizontal` set through `contentContainerStyle`, say). |
| `layers` | `number` | `8` | How many blur views make up the ramp. More is smoother and costs more; the band shows visible steps below four, and past eight nobody can tell. |
| `intensity` | `number` | `56` | Blur strength at the very edge, 0–100. The layers share it between them. |
| `material` | `ScrollBlurTint` | `default` | Which way the material tints. Defaults to the app's theme rather than the phone's, so an app running dark on a light phone does not blur light. |
| `color` | `string` | — | The colour the band fades towards — washed over the blur, and the whole effect where there is no blur to draw. Defaults to the theme's background. Pass the surface the scrollable actually sits on, or the band fades towards a colour that is not there. |
| `tint` | `number` | `0.95` | How opaque that wash gets at the outer edge, 0 to 1. Lower it to let more of the content show through the far end of the band; `0` leaves the blur bare, along with the seams between its layers. |
| `fadeInDistance` | `number` | `24` | Distance in pixels over which an edge comes in from clear to full. |
| `enabled` | `boolean` | `true` | Set false to render the child with no bands at all. |
| `children` | `ReactNode` | — | — |

### Example — A vertical list

The rows go soft as they reach the top and bottom of the viewport, and the band only appears once there is something behind it to blur.

```tsx
<ScrollBlur size={64}>
  <ScrollView showsVerticalScrollIndicator={false}>
    {rows.map((row) => (
      <Item key={row.id} variant="outline">
        <Item.Media variant="icon"><PackageIcon size={16} /></Item.Media>
        <Item.Content>
          <Item.Title>{row.name}</Item.Title>
          <Item.Description>{row.summary}</Item.Description>
        </Item.Content>
      </Item>
    ))}
  </ScrollView>
</ScrollBlur>
```

### Notes

### The ramp is a stack and a wash

A blur that goes from nothing to full across a band needs a per-pixel blur radius, and there is no such thing on either platform — a blur view has one strength for its whole rectangle.

So the ramp is built out of several of them. Each layer covers a shorter span than the last, measured from the edge, and each blurs what the layer under it has already blurred. The spans are spaced on a curve rather than evenly, which puts most of the layers in the outer third where the blur changes fastest and the steps would otherwise be widest.

That alone is not smooth. Every layer has a hard edge, and a stack of hard edges is a stack of visible lines however many there are. So a gradient of `color` is washed over the top — opaque at the outer edge, clear at the inner one. It hides the seams, and it is what makes the band read as one material rather than a pile of rectangles: the content goes soft and fades into the surface at once, which is what the eye expects an edge to do.

`layers` is the count. Six suits a 64-point band; a deeper one wants more. Each layer is a real native view, so this is the knob that costs something — below four the band shows steps, above eight nobody can tell. `tint` is how opaque the wash gets; `0` leaves the blur bare, along with its seams.

### `color` is not just the fallback

The wash fades towards `color`, so it matters even when the blur is drawn. Pass the surface the scrollable actually sits on — a sheet, a card, the page. Left on the theme background inside a sheet, the band fades towards a colour that is not there.

It is also the whole effect where there is no blur: `expo-blur` is an optional peer, and Reduce Transparency is a preference that outranks the design. Both fall back to the gradient alone.

### The rest

Orientation is read from the child's `horizontal` prop. Pass `orientation` explicitly for scrollables that do not expose it.

An edge only blurs once there is content past it, and neither edge blurs when the content fits inside the viewport — this is correct from the first frame, not just after the first scroll event.

**The child becomes a Reanimated animated component.** If you need `onScroll` on it yourself, it has to be an animated handler from `useAnimatedScrollHandler` — a plain function will not run.

`material` follows the app's theme rather than the phone's, so an app running dark on a light phone does not blur light. Pass `light` or `dark` to fix it.

For a flat, known background, [ScrollFade](/docs/components/scroll-fade) is cheaper: one gradient per edge against this component's four native views.

---

Full page, with every example: https://panelui.dev/docs/components/scroll-blur
