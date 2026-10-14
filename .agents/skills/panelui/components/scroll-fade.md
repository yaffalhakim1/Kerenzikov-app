# ScrollFade

Fades the edges of a scroll container.

```tsx
import { ScrollFade } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { ScrollFade } from '@/components/ui/scroll-fade';
```

### Usage

```tsx
<ScrollFade size={40}>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    <Item.Group orientation="horizontal">
      {categories.map((category) => (
        <Item key={category.id} orientation="vertical" variant="outline" size="sm" className="w-44">
          <Item.Media variant="icon"><PackageIcon size={16} /></Item.Media>
          <Item.Content>
            <Item.Title>{category.name}</Item.Title>
            <Item.Description>{category.summary}</Item.Description>
          </Item.Content>
        </Item>
      ))}
    </Item.Group>
  </ScrollView>
</ScrollFade>
```

### Props

#### `ScrollFadeProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `size` | `number` | `48` | Depth of the fade in pixels. |
| `edges` | `'both' \| 'start' \| 'end' \| 'none'` | `both` | Which edges fade. |
| `orientation` | `'horizontal' \| 'vertical'` | — | Scroll axis. Inferred from the child's `horizontal` prop when omitted — pass it explicitly for children that scroll horizontally without that prop (a `FlatList` with `horizontal` set through `contentContainerStyle`, say). |
| `color` | `string` | — | Colour the fade resolves to — normally whatever sits behind the scrollable. Defaults to the theme's background. |
| `fadeInDistance` | `number` | `24` | Distance in pixels over which an edge fades from clear to full. |
| `enabled` | `boolean` | `true` | Set false to render the child with no fades at all. |
| `children` | `ReactNode` | — | — |

### Example — A horizontal row of cards

A horizontal group of vertical items: each entry is a card, and the fade is what tells you there are more of them past the edge.

```tsx
<ScrollFade size={40}>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    <Item.Group orientation="horizontal">
      {categories.map((category) => (
        <Item key={category.id} orientation="vertical" variant="outline" size="sm" className="w-44">
          <Item.Media variant="icon"><PackageIcon size={16} /></Item.Media>
          <Item.Content>
            <Item.Title>{category.name}</Item.Title>
            <Item.Description>{category.summary}</Item.Description>
          </Item.Content>
        </Item>
      ))}
    </Item.Group>
  </ScrollView>
</ScrollFade>
```

### Notes

Orientation is read from the child's `horizontal` prop. Pass `orientation` explicitly for scrollables that do not expose it.

An edge only fades once there is content past it, and neither edge fades when the content fits inside the viewport — this is correct from the first frame, not just after the first scroll event.

**The child becomes a Reanimated animated component.** If you need `onScroll` on it yourself, it has to be an animated handler from `useAnimatedScrollHandler` — a plain function will not run.

The fade resolves to the theme background by default. Pass `color` when the scrollable sits on a card or another surface, or the fade will not blend.

---

Full page, with every example: https://panelui.dev/docs/components/scroll-fade
