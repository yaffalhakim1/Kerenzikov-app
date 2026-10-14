# Menu

The list of things you can do to something.

```tsx
import { Menu } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Menu } from '@/components/ui/menu';
```

### Anatomy

```tsx
<Menu>
  <Menu.Trigger>…</Menu.Trigger>
  <Menu.Content>
    <Menu.Background />
    <Menu.Label>…</Menu.Label>
    <Menu.Item>…</Menu.Item>
    <Menu.CheckboxItem>…</Menu.CheckboxItem>
    <Menu.RadioGroup>
      <Menu.RadioItem>…</Menu.RadioItem>
    </Menu.RadioGroup>
    <Menu.Separator />
    <Menu.Sub>
      <Menu.SubTrigger>…</Menu.SubTrigger>
      <Menu.SubContent>…</Menu.SubContent>
    </Menu.Sub>
  </Menu.Content>
</Menu>
```

### Variants

- **variant** — `default` *(default)*, `destructive`
- **disabled** — `true`
- **inset** — `true`

### Parts

- `Menu.Trigger` — Wraps a single child and opens the menu on press. It is also what gets measured, so the panel knows where to sit.
- `Menu.Content` — The panel, and what a screen reader announces as a menu. Portaled above everything else, positioned against the trigger, capped to the safe area and scrolled.
- `Menu.Background` — The panel's surface, drawn behind every row and outside its scroller. Rendered for you when you do not pass one; pass your own to put a gradient, an image or a blur under the rows.
- `Menu.Label` — Non-interactive heading over a run of rows.
- `Menu.Item` — One row. Dismisses the menu once it has run, unless `closeOnSelect` says otherwise.
- `Menu.CheckboxItem` — A row carrying a state rather than an action. Keeps the menu open by default.
- `Menu.RadioGroup` — A run of rows of which exactly one is chosen.
- `Menu.RadioItem` — One option inside a `Menu.RadioGroup`.
- `Menu.Separator` — Hairline between two runs of rows.
- `Menu.Sub` — Groups a `Menu.SubTrigger` with the rows it reveals.
- `Menu.SubTrigger` — The row that opens a submenu. Its chevron turns to point down once open.
- `Menu.SubContent` — The rows a submenu reveals, opening in place rather than flying out sideways.

### Props

#### `MenuProps`

Extends `PopoverProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `haptics` | `boolean` | — | Tick the haptic engine as a row is chosen. Needs the optional `expo-haptics`, and is silent without it. |

#### `MenuTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactElement<{ onPress?: (...args: unknown[]) => void }>` | **required** | — |

#### `MenuContentProps`

Extends `Omit<PopoverContentProps, 'children' \| 'scrollable'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |
| `scrollable` | `boolean` | — | Scroll the rows when there are more of them than fit on screen. On by default, unlike the popover it is built on: a menu is a list, its length is usually a `map` over data rather than something written out by hand, and a row that cannot be reached is a row that may as well not exist. |

#### `MenuBackgroundProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | What the panel is made of. A gradient, an image, a blur view — anything that fills. Left empty it is the plain overlay surface. |

#### `MenuLabelProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `inset` | `boolean` | `false` | Line the text up with rows that carry an icon or an indicator. |
| `children` | `ReactNode` | — | — |

#### `MenuSeparatorProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `MenuItemProps`

Extends `Omit<PressableProps, 'children' \| 'style'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | The row's label. |
| `icon` | `ReactNode` | — | Leading glyph, drawn in the indicator column. |
| `description` | `string` | — | Second line under the label, for a row whose effect needs a sentence. |
| `shortcut` | `string` | — | Right-aligned hint, for a row that also has a keyboard or gesture shortcut. |
| `trailing` | `ReactNode` | — | Element pinned to the row's trailing edge, after the shortcut. For the things a shortcut string cannot be — a chevron, a badge, a small avatar. |
| `variant` | `MenuItemVariant` | `default` | `destructive` colours the row for an action that removes something. |
| `inset` | `boolean` | `false` | Line the label up with rows that carry an icon, without drawing one. |
| `disabled` | `boolean` | `false` | — |
| `closeOnSelect` | `boolean` | `true` | Dismiss the menu once the row has run. Default true — a menu of verbs has done its job the moment one is chosen. Turn it off for a row that toggles something the user is likely to toggle twice. |
| `onSelect` | `() => void` | — | — |

#### `MenuCheckboxItemProps`

Extends `Omit<MenuItemProps, 'icon' \| 'inset'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `checked` | `boolean` | `false` | — |
| `onCheckedChange` | `(checked: boolean) => void` | — | — |

#### `MenuRadioGroupProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `string` | — | — |
| `onValueChange` | `(value: string) => void` | — | — |
| `children` | `ReactNode` | — | — |

#### `MenuRadioItemProps`

Extends `Omit<MenuItemProps, 'icon' \| 'inset'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | **required** | — |
| `indicator` | `MenuRadioIndicator` | `check` | `check` marks the chosen row, `dot` is quieter beside a list of nouns. |

#### `MenuSubProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |
| `defaultOpen` | `boolean` | — | — |
| `open` | `boolean` | — | — |
| `onOpenChange` | `(open: boolean) => void` | — | — |

#### `MenuSubTriggerProps`

Extends `Omit<MenuItemProps, 'closeOnSelect' \| 'shortcut' \| 'trailing'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `transform` | `[{ rotate: `${progress.value * 90 * sign}deg` }],` | **required** | — |
| `compose` | `the glyph turns itself around under RTL, and the parent` | **required** | — |

#### `MenuSubContentProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

### Example — A menu of actions

Rows dismiss the panel as they run — that is what separates a menu of verbs from a picker of values. `variant="destructive"` tints the row as well as recolouring the label, because this is the one row where reading past it is expensive.

```tsx
<Menu>
  <Menu.Trigger>
    <Button variant="outline">Options</Button>
  </Menu.Trigger>
  <Menu.Content align="start" width={224}>
    <Menu.Item icon={<ShareNodesIcon size={16} />} shortcut="⌘S">
      Share
    </Menu.Item>
    <Menu.Item icon={<PlusSquareIcon size={16} />}>Add to list</Menu.Item>
    <Menu.Item icon={<DownloadIcon size={16} />} disabled>
      Download
    </Menu.Item>
    <Menu.Separator />
    <Menu.Item variant="destructive" icon={<TrashIcon size={16} />}>
      Delete
    </Menu.Item>
  </Menu.Content>
</Menu>
```

### Notes

Every row carries the `menuitem` role, and a checkbox, radio or submenu row publishes its state alongside it — checked, selected or expanded — so a screen reader announces what the row *is* as well as what it says.

`Menu.Content` is capped to the room inside the safe area and scrolls, so the last row of a long menu is always reachable. Pass `maxHeight` to cap it lower than that, or `scrollable={false}` when the rows are written out by hand and known to fit.

### Indicators, and your own icons

The tick, the radio dot and the submenu chevron come from the library's own icon set, tinted from `--color-popover-foreground` and `--color-muted-foreground`. The chevron mirrors itself under RTL, and the quarter turn that opens a submenu is applied to the view around it — two transforms on two views, which compose, rather than one view trying to carry both.

`Menu.Item`’s `icon` prop takes any element, from any set, drawn in an 18pt column. Icons from outside this library do not read the ambient icon colour, so pass `color` yourself:

```tsx
const tint = useCSSVariable('--color-popover-foreground');

<Menu.Item icon={<Pencil size={16} color={tint} />}>Rename</Menu.Item>
```

### The panel's surface

The surface is a layer of its own — `Menu.Background`, an absolute fill behind the rows — rather than a background colour on the panel. A background cannot be got behind, and a menu that wants to be frosted or gradient-filled needs something under the rows and over nothing.

It draws on `--color-overlay`, which is a step further from the page than `--color-popover`. A menu is usually the thing furthest forward on the screen and often the thing on top of a popover; sharing one token with the panel underneath would make it disappear into it.

The layer is rendered outside the panel's scroller, so a surface stays put while the rows move over it. That is also why `Menu.Background` is lifted out of `Menu.Content`'s children rather than simply rendered among them.

### Press feedback

A pressed row fades its fill in over 90ms and back out over 160ms, and shrinks by 2% while it is held. `active:` could only swap the fill wholesale — in and out in a single frame each way, which on a row this size reads as a flash rather than as a press — and could not express the shrink at all. Both run on the UI thread off one shared value, and both are skipped when the system asks for reduced motion.

A blur belongs in the same slot: put an `expo-blur` `BlurView` inside `Menu.Background` and give the layer a semi-transparent tint (`bg-overlay/70`) so the blur shows through it.

`Menu.Item` composes consumer `onPress`, `onPressIn`, and `onPressOut` callbacks with its selection/dismissal and animated press feedback. The component retains ownership of its menu-item role, disabled state, row animation/style, and primary lifecycle after forwarding other Pressable props.

---

Full page, with every example: https://panelui.dev/docs/components/menu
