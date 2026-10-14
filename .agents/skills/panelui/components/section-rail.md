# SectionRail

Floating section navigator for a long screen.

```tsx
import { SectionRail } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { SectionRail } from '@/components/ui/section-rail';
```

### Anatomy

```tsx
<SectionRail>
  <SectionRail.Trigger>
    <SectionRail.Bar value="…" />
  </SectionRail.Trigger>
  <SectionRail.Content>
    <SectionRail.Item value="…">…</SectionRail.Item>
  </SectionRail.Content>
</SectionRail>
```

### Parts

- `SectionRail.Trigger` — The collapsed rail. One press target over the whole stack of bars, because a hairline is not something anyone can hit.
- `SectionRail.Bar` — One section, drawn as a bar. The active one is longest and brightest, the bars either side of it keep part of that, and the rest sit at the resting length — so the silhouette says roughly how far down the run you are without anybody counting bars. A deeper `level` draws a shorter bar.
- `SectionRail.Content` — The expanded panel, mounted through a portal so it floats over everything and unmounted after it fades out.
- `SectionRail.Item` — A labelled row in the panel, indented to match its bar.

### Props

#### `SectionRailProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `placement` | `SectionRailPlacement` | `right` | Which edge the rail sits against. |
| `align` | `SectionRailAlign` | `center` | Where along that edge it sits. `bottom` puts it in a corner, out of the way of the text — the panel then opens upward from the rail rather than centred on the screen. |
| `haptics` | `boolean` | `false` | Tick under the finger on every change of section, however it was made — tapped in the panel, or scrolled past. Needs the optional `expo-haptics` package; without it this does nothing. |
| `value` | `string` | — | Active section id. Controlled — usually driven by a scroll handler. |
| `defaultValue` | `string` | — | Starting section when uncontrolled. |
| `onValueChange` | `(value: string) => void` | — | Fires when a section is chosen from the expanded panel. |
| `open` | `boolean` | — | Controlled expansion. |
| `defaultOpen` | `boolean` | `false` | — |
| `onOpenChange` | `(open: boolean) => void` | — | — |
| `closeDelay` | `number` | `300` | How long the panel stays up after a choice, so a mis-tap can be corrected without opening it again. Set 0 to close immediately. |
| `offset` | `number` | `12` | Gap between the rail and the edge of the safe area. |
| `children` | `ReactNode` | **required** | — |

#### `SectionRailTriggerProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | **required** | — |

#### `SectionRailBarProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `string` | **required** | Section this bar stands for. Matches the root's `value`. |
| `level` | `number` | — | Nesting depth. Deeper levels draw a shorter bar. |

#### `SectionRailContentProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `maxWidth` | `number \| `${number}%`` | `78%` | How wide the panel may grow, as a fraction of the screen or a point width. The default leaves room for the rail and the edge it is anchored to; raise it for a screen whose section titles are long enough to be worth wrapping rather than truncating. |
| `children` | `ReactNode` | **required** | — |

#### `SectionRailItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `string` | **required** | Section this row jumps to. Matches the root's `value`. |
| `level` | `number` | — | Nesting depth. Indents the row to match its bar. |
| `children` | `ReactNode` | **required** | — |

### Example — Driving it from a scroll position

The rail does not watch the scroll itself — it takes a `value`. [useScrollSections](/docs/hooks/use-scroll-sections) supplies one: it records where each section landed, picks the one being read, and hands back a `scrollTo` that is exactly the shape `onValueChange` wants. It also handles the end of the page, where the last section’s top never reaches the reading line because the content runs out first.

```tsx
const sections = useScrollSections({ ids: SECTIONS.map((s) => s.id) });

<ScrollView ref={sections.ref} {...sections.scrollProps}>
  {SECTIONS.map((section) => (
    <View key={section.id} onLayout={sections.measure(section.id)}>
      {/* …section… */}
    </View>
  ))}
</ScrollView>

<SectionRail
  align="bottom"
  value={sections.active}
  onValueChange={sections.scrollTo}
>
  {/* …bars and items… */}
</SectionRail>
```

### Notes

The bars carry no labels, and that is the design rather than an omission. A permanent list of section titles down the side of a phone screen is either too small to read or too wide to keep; the bars carry the two things that survive at that size — which section you are in, and roughly how deep it sits.

The root is absolutely positioned with `pointerEvents="box-none"`, so the rail takes touches but the empty column around it does not. Without that a strip down the side of the screen would swallow every scroll that started in it.

A row wraps to two lines before it truncates, and the panel is capped at a share of the screen rather than a fixed width, so the same rail works on a phone and on a tablet. `maxWidth` on `SectionRail.Content` moves that cap when the titles need it.

Choosing a section leaves the panel up for `closeDelay` (300ms) so a mis-tap can be corrected without opening it again. Pass `0` to close immediately.

### Haptics

`haptics` ticks under the finger on every change of section — tapped in the panel or scrolled past, because both are the section changing. It is the light selection tick rather than an impact: anything heavier gets tiring when it can fire on every scroll.

It needs the optional `expo-haptics` package and does nothing without it, so it is safe to pass either way.

```sh
npx expo install expo-haptics
```

---

Full page, with every example: https://panelui.dev/docs/components/section-rail
