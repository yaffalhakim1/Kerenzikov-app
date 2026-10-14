# SectionProgress

Floating pill with a scroll ring and the section being read.

```tsx
import { SectionProgress } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { SectionProgress } from '@/components/ui/section-progress';
```

### Anatomy

```tsx
<SectionProgress>
  <SectionProgress.Item value="…">…</SectionProgress.Item>
</SectionProgress>
```

### Parts

- `SectionProgress.Item` — One section. It is a row in the card the pill opens into, and its children are what the collapsed pill shows while that section is the one being read — so the title is written once and serves both.

### Props

#### `SectionProgressProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `scroll` | `SectionProgressScroll` | — | The scroll position the ring is filled from. `useScrollSections` returns one as `scroll`; without it the component falls back to the nearest `ScrollProgress`, and with neither the ring stays empty. |
| `progress` | `SharedValue<number> \| number` | — | Fill the ring from a value of your own, between 0 and 1. Nothing is derived when this is passed. |
| `value` | `string` | — | Active section id. Controlled — usually driven by a scroll handler. |
| `defaultValue` | `string` | — | Starting section when uncontrolled. |
| `onValueChange` | `(value: string) => void` | — | Fires when a section is chosen from the panel. Scroll there. |
| `open` | `boolean` | — | Controlled expansion of the panel. |
| `defaultOpen` | `boolean` | `false` | Whether the panel starts open when uncontrolled. |
| `onOpenChange` | `(open: boolean) => void` | — | Fires when the panel opens or closes, however it was done. |
| `placement` | `SectionProgressPlacement` | `bottom-center` | Which corner or edge the pill floats in. |
| `offset` | `number` | `16` | Gap between the pill and the edge of the safe area. |
| `revealAt` | `number` | `64` | How far the reader must scroll, in points, before the pill appears. `0` shows it from the first frame. It never hides again. |
| `haptics` | `boolean` | `false` | Tick under the finger on every change of section, however it was made. Nothing between a tap in the panel and its arrival counts as a change. Needs the optional `expo-haptics` package; without it this does nothing. |
| `label` | `string` | `Sections` | What the pill is called to a screen reader. The section being read and the percentage are announced after it, so this names the control rather than describing the state. |
| `children` | `ReactNode` | **required** | One `SectionProgress.Item` per section, in the order they appear. |

#### `SectionProgressItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `string` | **required** | Section this row jumps to. Matches the root's `value`. |
| `color` | `SectionProgressColor` | — | The colour this section brings to the pill. Left out, the section takes the foreground colour like every other. |
| `children` | `ReactNode` | **required** | The section's title. It is what the collapsed pill shows. |

### Example — Driving it from a scroll position

The pill watches nothing itself — it takes a `value` and a `scroll`. [useScrollSections](/docs/hooks/use-scroll-sections) supplies both from one handler: it records where each section landed, picks the one being read, publishes the scroll position the ring is filled from, and hands back a `scrollTo` that is the shape `onValueChange` wants.

One handler for both is the point. The ring and the label have to agree about where the page is, and two listeners reading the same scroll at different moments do not.

```tsx
const sections = useScrollSections({ ids: SECTIONS.map((s) => s.id) });

<ScrollView ref={sections.ref} {...sections.scrollProps}>
  {SECTIONS.map((section) => (
    <View key={section.id} onLayout={sections.measure(section.id)}>
      <Text size="2xl" weight="semibold">{section.label}</Text>
      {/* …section body… */}
    </View>
  ))}
</ScrollView>

<SectionProgress
  scroll={sections.scroll}
  value={sections.active}
  onValueChange={sections.scrollTo}
>
  {SECTIONS.map((section) => (
    <SectionProgress.Item key={section.id} value={section.id}>
      {section.label}
    </SectionProgress.Item>
  ))}
</SectionProgress>
```

### Notes

Open, the list and the pill are one bordered card rather than a panel above a button: the pill's row is the end of the card, and the card carries the only border, background and shadow in the control.

It floats above the screen's content, so leave room at the end of the scroll: `contentContainerStyle={{ paddingBottom: 96 }}` keeps the last paragraph clear of the pill.

The list opens to about six rows and scrolls past that, so a screen with twenty sections gets a list rather than a column the height of the screen.

The ring is filled from a value that arrives on the JavaScript thread at the scroll handler's throttle, and eased towards on the UI thread. It therefore trails the scroll by a fraction of a second and settles when the scroll does, which is what keeps it a glide rather than a series of steps.

One instance per scroll surface. A second pill over the same screen would report the same number twice and cover the first.

---

Full page, with every example: https://panelui.dev/docs/components/section-progress
