# Hooks, utilities and primitives

Everything the library exports that is not a component. All of it comes from `panelui-native`.

## Hooks

| Hook | Signature | When to reach for it |
| --- | --- | --- |
| `useDisclosure` | `({ defaultOpen?, open?, onOpenChange? }) => { open, onOpen, onClose, onToggle, setOpen }` | Holding an overlay's open state. Works controlled or not, so a Dialog can start uncontrolled and become controlled without rewriting it. |
| `useKeyboard` | `() => { height: number; isVisible: boolean }` | The keyboard's height **when it drives rendering** — a max height, a conditional layout. For animation use `useKeyboardAvoidance`, which stays on the UI thread. |
| `useKeyboardAvoidance` | `({ enabled?, active?, mode?, offset?, bottomInset? }) => { ref, onLayout, animatedStyle }` | Keeping an element clear of the keyboard. `mode: 'lift'` measures the element every frame and moves it by its overlap — right for a field in a scrolling page. `mode: 'dock'` rides the keyboard outright, for a composer pinned to the bottom. Pass `active` a field's own focus state, or every field on the screen lifts at once. Prefer the `KeyboardAvoider` primitive unless the wiring has to be manual. |
| `useDebouncedValue` | `(value, delay) => value` | A value that should settle before something expensive reads it — a search query, a filter. |
| `useBackHandler` | `(enabled, handler) => void` | Android's back gesture while something is open. Every overlay in the library already does this; use it for one of your own. |
| `useCopyToClipboard` | `({ timeout? }) => { copy, copied, error }` | Copy-to-clipboard with the "Copied" state already timed. Needs `expo-clipboard`; without it `copy` reports an error rather than throwing. |
| `useBreakpoint` | `() => { width, breakpoint, isAtLeast, isBelow }` | Layout that changes with the width. `createBreakpoints` makes a custom scale; `BREAKPOINTS` is the default one. |
| `usePrevious` | `(value) => value \| undefined` | The value from the last render, for comparing against this one. |
| `useRevealProgress` | `({ threshold?, once? }) => { ref, onLayout, progress }` | How far into view an element has scrolled, as a shared value — for revealing content on scroll without a re-render per frame. |
| `useScrollSections` | `({ ids }) => { onScroll, onLayout, active, scrollTo }` | Which section of a long screen is on screen, for a rail or a set of tabs indexing it. What `SectionRail` is built on. |
| `useSkeletonHandoff` | `(loading, duration?) => { mounted, opacity }` | Keeping a placeholder mounted for the length of its own fade after the real content arrives. Cut at the frame the data lands, a placeholder disappears before anything has replaced it. `SKELETON_FADE` is the default duration. |

## Theme

| Export | Signature | What it is |
| --- | --- | --- |
| `useThemeMode` | `() => { theme, setTheme, mode, setMode, family }` | Reading and switching the theme at runtime. A named theme has to be listed in `extraThemes` in `metro.config.js` first, and the dev server restarted, or `setTheme` throws. |
| `useTheme` | `() => PanelTheme` | The resolved theme object — its name, family and mode. |
| `PANEL_THEMES`, `PANEL_THEME_NAMES`, `PANEL_EXTRA_THEMES` | constants | The six themes, for building a picker. `PANEL_EXTRA_THEMES` is exactly the list `extraThemes` wants. |
| `useCSSVariable` | `(name) => string` | **From `uniwind`, not from PanelUI.** Reads a token's resolved value in JavaScript — for anything that needs a colour as a *value* rather than as a class: an SVG fill, a native prop, a chart series. Never read a hex out of the theme by hand. |

```tsx
import { useCSSVariable } from 'uniwind';

const border = useCSSVariable('--color-border');
<Svg><Line stroke={typeof border === 'string' ? border : 'rgba(0,0,0,0.1)'} /></Svg>
```

## Utilities

| Export | What it does |
| --- | --- |
| `cn(...classes)` | Merges class names and resolves Tailwind conflicts. Use it for conditional classes — never a template-literal ternary, which leaves both sides of a conflict in the string. |
| `formatColor`, `parseColor`, `isValidColor`, `hsvToHex`, `hsvToRgb`, `hsvToHsl`, `hsvToCss`, `rgbToHsv` | Colour conversion, as `ColorPicker` uses it. `HsvaColor` and `ColorFormat` are the types. |
| `formatTime`, `clampTime`, `compareTime`, `isSameTime`, `isTimeInRange`, `minutesToTime`, `timeToMinutes`, `timeFromDate`, `timeToDate`, `roundToStep`, `displayHour`, `meridiemLabels`, `timesOfDay` | Time arithmetic, as `TimePicker` uses it. |
| `hasHaptics()`, `selectionTick()` | Whether `expo-haptics` is present, and the light tick every selectable control uses. |
| `hasNativeUI()`, `hasGlass()`, `hasBlur()` | Whether `@expo/ui`, Liquid Glass and blur are available. Use these before promising a look that depends on them. |

## Primitives

Lower-level than a component, and public so something you build yourself gets the same treatment
as the built-ins.

| Export | What it is |
| --- | --- |
| `PanelUIProvider` | The root. Gesture handler root, themed background, the portal host every overlay renders into, and the toast viewport. Exactly one, at the top of the app. |
| `Portal`, `PortalHost`, `PortalProvider` | Rendering into the provider's host, for an overlay of your own. |
| `KeyboardAvoider` | `useKeyboardAvoidance` as a view. Takes `active`, `mode`, `offset`, `bottomInset`. |
| `AnimatedPressable` | Pressable with UI-thread press feedback (`pressScale`, `pressOpacity`). The base every interactive component is built on. Set `pressScale={1}` for a full-width row — a wide target that shrinks reads as a card. |
| `Text` | The text primitive, with `size`, `weight` and `muted`. Everything in the library writes through it, so a custom font reaches all of it. |
| `Collapse` | Height animation for content that opens and closes. |
| `Scrim` | The layer that makes the screen behind an overlay recede, with a fall back from blur to dim. |
| `Glass` | The material iOS draws floating controls in, with a solid fallback where there is none. |
| `ScrollProgress`, `useScrollProgress` | Scroll position as a shared value, for something that follows a scroll on the UI thread. |

## Rules that apply to all of it

- **Reanimated 4 only.** Never React Native's core `Animated`; the two do not compose, and core
  `Animated` puts the work back on the JS thread.
- **A shared value drives an animation, state drives a render.** Anything changing every frame
  belongs in `useAnimatedStyle` or `useAnimatedProps`, not in `useState`.
- **`tv()` at module scope**, never inside a render.
