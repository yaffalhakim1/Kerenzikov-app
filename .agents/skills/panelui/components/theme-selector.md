# ThemeSelector

Light, dark or the device's setting, drawn as three miniature screens.

```tsx
import { ThemeSelector } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { ThemeSelector } from '@/components/ui/theme-selector';
```

### Anatomy

```tsx
<ThemeSelector>
  <ThemeSelector.Option value="system" />
  <ThemeSelector.Option value="light" />
  <ThemeSelector.Option value="dark" />
</ThemeSelector>
```

### Variants

- **selected** — `true`, `false` *(default)*
- **disabled** — `true`

### Parts

- `ThemeSelector.Option`

### Props

#### `ThemeSelectorProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `ThemeSelection` | — | Show this as chosen instead of whatever the app is actually on. For a settings screen that stages a choice before applying it; left unset, the selector reads the live theme. |
| `onValueChange` | `(value: ThemeSelection) => void` | — | Fires with the option pressed, before the theme changes. |
| `applyTheme` | `boolean` | `true` | Apply the choice. On by default — a theme selector that does not select a theme is a radio group. Turn it off to store the choice and apply it yourself, which is what an app that persists the preference wants. |
| `label` | `string` | — | The heading above the row. Left out, there is none. |
| `variant` | `ThemePreviewVariant` | `window` | Which miniature is drawn. `window` is an app screen with a panel on it; `card` is a framed card with an accent, cut on the diagonal for system. |
| `size` | `ThemeSelectorSize` | `md` | How wide the miniatures are drawn. `sm` for a settings row that has other things on it; `md` when choosing the theme is what the screen is for. |
| `disabled` | `boolean` | `false` | Stop the row being pressed, and dim it to say so. |
| `children` | `ReactNode` | — | The options, in the order you want them. Left out, the selector draws system, light and dark in that order — which is the whole component. |

#### `ThemeSelectorOptionProps`

Extends `Omit<PressableProps, 'children' \| 'onPress'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `ThemeSelection` | **required** | Which of the three this option chooses. |
| `label` | `string` | — | What it is called under the miniature. Defaults to System, Light or Dark. |
| `children` | `ReactNode` | — | Replaces the drawn miniature. |

### Example — Three options and a heading

No children and no value: the selector draws all three and reads the theme the app is actually on.

```tsx
<ThemeSelector label="Choose a theme" />
```

### Notes

### The miniatures are not made of your theme

They are drawn from fixed greys, which is the one decision here worth writing down. A preview built from the active theme's tokens shows the reader the theme they already have, three times over — the light option has to look light while the app around it is dark, or it is not a preview of anything. The ring and the labels do use tokens, because those belong to the app rather than to what is being previewed.

### Light and dark stay inside the family

A reader on `moon` who picks Light gets `moon`, not the default light theme. The selector changes the mode and leaves the family alone.

**System is the exception, and cannot be otherwise.** Following the device means following what the device knows, and the device knows light and dark — so choosing it from a named family leaves that family behind. Where that matters, leave `System` out of the row.

### It reads the theme rather than remembering it

There is already one answer to which theme the app is on, so the selector asks for it instead of keeping a copy that can drift. That is also what makes `System` reportable at all: the moment it is applied it resolves to light or dark, and the resulting theme name is indistinguishable from the same one chosen by hand. What separates them is whether the theme is still following the device, which is what `useThemeSelection` reads.

### Accessibility

The row announces as a radio group and each option as a radio, so the whole control is one stop with three values rather than three separate buttons. The miniatures are decorative and are not announced — the word under each one is the option's name, and it is inside the target, because at this size it is the easier half to hit.

---

Full page, with every example: https://panelui.dev/docs/components/theme-selector
