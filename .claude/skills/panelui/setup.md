# Setup, and why nothing is styled

Two things live here: how a project gets PanelUI installed, and what to check when it is installed
and nothing looks right. **Start at the second one.** "Nothing is styled" is the failure people
actually hit, it produces no error, and it is a wrong path in `metro.config.js` almost every time.

## Nothing is styled — `className` does nothing at all

There is no error for this. Metro bundles, the app launches, and no class resolves — so views with
`flex-1` have no height and the screen is blank or collapsed. Work down this list in order; it is
almost always the first item.

1. **`metro.config.js` is not in the project root**, next to `package.json`. One in `app/` or
   `src/` is silently ignored.
2. **It does not wrap the config in `withUniwindConfig`**, or does not export the wrapped result.
3. **`cssEntryFile` does not point at the CSS file that was actually edited**, relative to
   `metro.config.js`. In an app from `create-expo-app` that file is `src/global.css`, not
   `global.css`. Nothing validates this path.
4. **There are two CSS files** — the one the template shipped in `src/` and a new one at the root.
   Only the file named by `cssEntryFile` is compiled. Keep one.
5. **`import './global.css'` is missing from the entry file**, or points at the wrong path. From
   `src/app/_layout.tsx` it is `'../global.css'`.
6. **The dev server was running when one of those changed.** Stop it and run
   `npx expo start --clear`.

## The other errors, and what each one means

| What you see | What it is |
| --- | --- |
| `Uniwind - We couldn't find your variable --color-background` | `cssEntryFile` points at a file Uniwind did not compile. It names a variable, but no class compiled either — which is why the screen is also blank. Fix the path, restart with `--clear`. |
| `Unable to resolve module @react-native-masked-view/masked-view` (or `expo-linear-gradient`) | A peer dependency is missing. Install **all** of them, not just the one named — Metro resolves every import in the library, including components the app never renders. |
| My own classes work, PanelUI's components are unstyled | The `@source` line in the CSS is missing or its relative path does not land on `node_modules/panelui-native/src`. It is relative to the CSS file, not to the project. |
| `Theme … is missing variable …` | A stale dev server rewrote Uniwind's generated CSS from the old `extraThemes` list. Stop it completely, start again with `--clear`. |
| `setTheme('moon')` throws that the theme "was not registered" | Named themes have to be listed in `extraThemes` in `metro.config.js`, and the server restarted after adding them. |
| `Cannot use @variant with unknown variant: moon` at build time | Fixed in 0.22.5. Upgrade: `npx expo install panelui-native`. |
| `className` is a type error, or has no autocomplete | `uniwind-types.d.ts` is written on the first successful bundle. Run the app once, then check it exists where `dtsFile` says and that `tsconfig.json` includes it. |
| The app builds but overlays never appear | Dialog, BottomSheet, Popover, Select and Toast render into the portal host `PanelUIProvider` sets up. It has to be at the root, and there must be exactly one. |
| A new arbitrary class (`h-[330px]`) does nothing | The dev server did not see the value when it started. Restart it, or reuse a value already in the project. |

## Installing it

### A new app

```bash
npx create-panelui-app@latest
```

Everything below is already done — Metro, the CSS entry, the provider, a theme and a screen with
components on it.

### An existing app

Expo SDK 57+, React Native 0.86, Node 20+. No native modules, so it runs in Expo Go and needs no
`prebuild`.

**1. The package.**

```bash
npx expo install panelui-native
```

**2. The peer dependencies. All nine, including the ones that look unnecessary** — Metro resolves
every import in the library when it builds the bundle, so a missing one fails the *first* bundle
for a component the app may never use.

```bash
npx expo install uniwind tailwindcss react-native-reanimated react-native-worklets \
  react-native-gesture-handler react-native-safe-area-context react-native-svg \
  @react-native-masked-view/masked-view expo-linear-gradient
```

Use `expo install`, not a pinned version: it asks the installed SDK which version each package was
built against. Pinning by hand produces the mismatch the pinning was meant to prevent, one SDK
upgrade later.

**3. `metro.config.js`, in the project root.** A fresh Expo app has none —
`npx expo customize metro.config.js` writes one. Then wrap it:

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './uniwind-types.d.ts',
  // Only needed to switch to the Moon or Grass themes at runtime.
  extraThemes: ['moon', 'moon-dark', 'grass', 'grass-dark'],
});
```

Both paths are relative to **this file**. `./src/global.css` is where `create-expo-app` puts it; if
the CSS is at the project root it is `'./global.css'`.

**4. The CSS entry.** An app from `create-expo-app` already has `src/global.css` — add these to the
top of it and leave what is there below. Do not create a second one.

```css
@import 'tailwindcss';
@import 'uniwind';
@import 'panelui-native/theme.css';

@source '../node_modules/panelui-native/src';
```

`@source` tells Tailwind to scan PanelUI's own class names so its styles reach the bundle. **It is
relative to the CSS file, not to the project**, and getting it wrong is the single most common
mistake — the app's own classes work and every PanelUI component comes out unstyled.

| CSS file lives in | `@source` |
| --- | --- |
| `src/` (the default) | `'../node_modules/panelui-native/src'` |
| the project root | `'./node_modules/panelui-native/src'` |
| `src/styles/` | `'../../node_modules/panelui-native/src'` |

**5. The import and the provider**, in the app's entry file. With Expo Router that is
`src/app/_layout.tsx`, and the CSS import is `'../global.css'` because the file sits a level above.

```tsx
import '../global.css';
import { PanelUIProvider } from 'panelui-native';

export default function RootLayout() {
  return <PanelUIProvider>{/* your app */}</PanelUIProvider>;
}
```

`PanelUIProvider` owns the gesture handler root, the themed page background, the portal host every
overlay renders into, and the toast viewport. **Exactly one, at the root.** Nesting a second one
breaks overlays.

If the template's `_layout.tsx` already returns a navigation `ThemeProvider`, wrap it rather than
replacing it — and be aware it paints its own background over every screen, which fights PanelUI's
once themes start switching.

**6. Restart with a clear cache**, and check a component renders:

```bash
npx expo start --clear
```

## Optional dependencies

Each is reached through a guarded import, so the library works without it and the feature stays
quiet rather than failing.

| Package | Unlocks |
| --- | --- |
| `expo-haptics` | The `haptics` prop on Switch, Slider, Chip, Rating, ToggleButton, NumberInput, SectionRail |
| `expo-blur` | The blurred backdrop behind Dialog, BottomSheet and Popover |
| `expo-clipboard` | `useCopyToClipboard` |
| `react-native-keyboard-controller` | Keyboard avoidance that behaves on Android — `avoidKeyboard`, `useKeyboardAvoidance` |
| `expo-file-system`, `react-native-view-shot` | Exporting a Signature as a file or an image |
| `@expo/ui` | The `native` prop on Button, Switch, Slider, Select, BottomSheet |
| `@maplibre/maplibre-react-native` | The Map component |
| `expo-glass-effect` | Liquid Glass surfaces on iOS 26 |

## After changing a dependency

Clear Metro's cache once: `npx expo start --clear`. Its transform cache key does not include the
version of the Babel plugins that produced the cached output, so a plugin upgrade leaves stale
output in place and the new runtime rejects it — most visibly as a worklets version mismatch. It is
not a broken tree, and no reinstall fixes it.
