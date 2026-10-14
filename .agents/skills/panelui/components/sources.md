# Sources

Where an answer came from, folded under a count.

```tsx
import { Sources } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Sources } from '@/components/ui/sources';
```

### Usage

```tsx
<Sources>
  <Sources.Trigger count={sources.length} />
  <Sources.Content>
    {sources.map((source) => (
      <Sources.Source
        key={source.url}
        href={source.url}
        title={source.title}
      />
    ))}
  </Sources.Content>
</Sources>
```

### Parts

- `Sources.Trigger` — The line that opens the list. `count` reads "Used 6 sources".
- `Sources.Content` — The list, collapsed until the trigger is pressed.
- `Sources.Source` — One citation. Opens `href` with the platform's own handler, and falls back to the URL's host when there is no `title`.

### Props

#### `SourcesProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `open` | `boolean` | — | Controlled open state. |
| `defaultOpen` | `boolean` | `false` | Initial state when uncontrolled. Folded, which is where a citation list belongs. |
| `onOpenChange` | `(open: boolean) => void` | — | — |
| `children` | `ReactNode` | — | — |

#### `SourcesTriggerProps`

Extends `Omit<PressableProps, 'children' \| 'style'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `count` | `number` | `0` | How many sources the list holds. Reads "Used 6 sources". |
| `children` | `ReactNode` | — | Replaces the whole row. |

#### `SourcesContentProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `SourcesSourceProps`

Extends `Omit<PressableProps, 'children' \| 'style'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `href` | `string` | — | Where the row goes. Opened with the platform's own handler. |
| `title` | `string` | — | What the row says. Falls back to the URL's host, which is a better label than a hundred characters of path — and models often send no title at all. |
| `icon` | `ReactNode` | — | Leading glyph. A link by default; a favicon suits a real citation list. |
| `children` | `ReactNode` | — | — |

### Example — A list of citations

`title` is what the row says and `href` is where it goes. With no title the host stands in — which is a better label than a hundred characters of path, and models often send no title at all.

```tsx
<Sources>
  <Sources.Trigger count={3} />
  <Sources.Content>
    <Sources.Source href="https://expo.dev/changelog" title="Expo SDK 57" />
    <Sources.Source href="https://reactnative.dev/blog" title="New Architecture" />
    <Sources.Source href="https://docs.swmansion.com/react-native-reanimated/" />
  </Sources.Content>
</Sources>
```

### Notes

**A row is a link, and says so.** Each carries the `link` role and its title as the accessibility label, so a screen reader announces where it goes rather than reading the URL out character by character.

**The host is parsed with a regex, not `URL`.** `URL` exists in Hermes but throws on anything malformed, and a model's citation is not a thing to trust with an exception. A label is worth having even when the string it came from is not a URL at all.

**`Linking.openURL` is called without a `canOpenURL` guard.** That check needs the scheme declared up front on iOS, and a source is always http(s), which is always openable — the guard would only add a way to fail.

**Nothing here depends on the AI SDK.** `href` and `title` are strings; they happen to be the shape of a `source-url` part.

---

Full page, with every example: https://panelui.dev/docs/ai-components/sources
