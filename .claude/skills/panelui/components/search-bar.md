# SearchBar

Search field with a clear button, a Cancel button and a panel of results.

```tsx
import { SearchBar } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { SearchBar } from '@/components/ui/search-bar';
```

### Anatomy

```tsx
<SearchBar avoidKeyboard tokens={picked.map(…)}>
  <SearchBar.Token onRemove={…}>Claude</SearchBar.Token>   {/* inside the field */}
  <SearchBar.Section label="Suggested">   {/* a labelled run of rows */}
    <SearchBar.Item trailing={<SearchBar.Action …/>}>…</SearchBar.Item>
  </SearchBar.Section>
  <SearchBar.Status loading>Searching …</SearchBar.Status>   {/* instead of rows */}
</SearchBar>
```

### Variants

- **size** — `sm`, `md` *(default)*, `lg`
- **shape** — `rounded` *(default)*, `pill`
- **attached** — `none` *(default)*, `top`, `bottom`
- **selected** — `true`

### Parts

- `SearchBar.Section` — A labelled run of rows — "Suggested", "Results". The label is announced as a header, so a screen reader reaching the group is told what it is before walking into it.
- `SearchBar.Item` — One result. `leading` and `trailing` are slots rather than built-in controls, because what a result row offers differs per search: an add, a pin, a count, nothing.
- `SearchBar.Action` — A button inside a row — an add, a pin, a remove — for `Item`'s `trailing` slot. Use it rather than a plain `Pressable`: a control nested inside a row takes the touch itself, so the row never sees the press and cannot hold the field's focus on the button's behalf. Without that, the press lands and the panel it was drawn in closes underneath it.
- `SearchBar.Token` — One choice already made, drawn inside the field before the caret. Pass `onRemove` for the ✕; without it the chip is a label. Tokens go to the root's `tokens` prop, not into the panel.
- `SearchBar.Status` — The one line a panel shows instead of rows. Use it for all three of nothing typed yet, a search in flight, and a query that matched nothing — those states look identical when the panel is simply blank, and which one it is decides what the person does next.

### Props

#### `SearchBarProps`

Extends `InheritedInputProps, Omit<SearchBarVariantProps, 'attached' \| 'selected'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `InputProps['variant']` | — | The field's background, from `Input`. `outline` draws its own edge, for a search bar sitting on the page; `filled` drops it, for one inside a card or a header where a second border reads as a seam. Defaults to `outline`. |
| `value` | `string` | — | The query, when the caller holds it. Leave unset to let the field keep it. |
| `defaultValue` | `string` | — | Starting query for an uncontrolled field. Ignored once `value` is passed. |
| `onChangeText` | `(value: string) => void` | — | Fires on every keystroke. For a search that costs something, see `debounce`. |
| `onSubmit` | `(value: string) => void` | — | The return key, which is labelled Search. Flushes `onDebouncedChange` first. |
| `debounce` | `number` | `0` | How long typing has to pause before `onDebouncedChange` runs, in milliseconds. `0` runs it on every keystroke, which is only right for a filter over a list already in memory. |
| `onDebouncedChange` | `(value: string) => void` | — | The query, once typing has paused for `debounce` milliseconds. |
| `onClear` | `() => void` | — | Fires after the ✕ empties the field. The field keeps focus. |
| `onCancel` | `() => void` | — | Fires after Cancel empties the field and drops focus. |
| `isClearable` | `boolean` | `true` | Whether the ✕ appears once there is a query. |
| `cancel` | `'never' \| 'focus' \| 'always'` | `never` | When the Cancel button is beside the field. `focus` slides it in while the field is being edited and away again when it is not, which is what a search bar above a list wants. `always` keeps it out, for a screen that is nothing but the search. |
| `cancelLabel` | `string` | `Cancel` | The Cancel button's word. |
| `clearLabel` | `string` | `Clear search` | How the ✕ announces itself. |
| `loading` | `boolean` | `false` | Results are on their way. A spinner takes the ✕'s place, because the two would otherwise sit on top of one another at exactly the moment a query is both non-empty and running. |
| `icon` | `ReactNode` | — | The leading glyph, for a search over something with a symbol of its own. |
| `avoidKeyboard` | `boolean` | `false` | Lift the whole search — field, Cancel button and panel — until it sits clear of the software keyboard, and put it back on blur. Without it the field stays where the page left it, which on most screens is behind the keyboard it just opened. Install `react-native-keyboard-controller` for this to behave on Android. Do not toggle it at runtime: it changes which component wraps the row, so the field would remount and lose focus. |
| `keyboardOffset` | `number` | `12` | Gap kept between the field's bottom edge and the keyboard. |
| `panel` | `SearchBarPanelMode` | `focus` | When the results panel is shown. `focus` opens it while the field is being typed into, `always` keeps it out for a screen that is nothing but the search, `never` ignores the children entirely. |
| `panelPlacement` | `SearchBarPanelPlacement` | `top` | Which side of the field the panel opens out of. `top` is the default, because the space under a focused field belongs to the keyboard. |
| `panelMaxHeight` | `number` | — | Cap on the panel's height, in points. The panel takes the smaller of this and the room between the field and the edge of the screen, so it never runs off the top of the display. Unset, it is capped at about six rows: the space above a lifted field is most of the screen, and a panel that takes all of it stops reading as something laid over the app. Longer lists scroll. |
| `tokens` | `ReactNode` | — | What has been picked so far, drawn inside the field before the caret. `SearchBar.Token` is the chip; anything else that fits on one line works too. Tokens scroll rather than wrap, so the field stays one line tall. |
| `onRemoveLastToken` | `() => void` | — | Fires when backspace is pressed in an empty field. Remove the last token here — it is the gesture every token field answers, and without it the only way back out of a choice is its own ✕. |
| `children` | `ReactNode` | — | The panel's contents — `SearchBar.Section`, `.Item` and `.Status`. |

#### `SearchBarSectionProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `label` | `string` | — | The heading over the run of rows — "Suggested", "Results". Announced as a header, so a screen reader reaching the group is told what it is before walking into it. |
| `children` | `ReactNode` | — | — |

#### `SearchBarItemProps`

Extends `Omit<AnimatedPressableProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `leading` | `ReactNode` | — | Anything before the label — an avatar, a logo, a status dot. |
| `trailing` | `ReactNode` | — | Anything after it. A slot rather than a built-in button, because what a result row offers differs per search: an add, a pin, a count, nothing. |
| `description` | `string` | — | A second line under the label, for what the label alone cannot say. |
| `selected` | `boolean` | — | Draws the row as the one the search has settled on. |
| `children` | `ReactNode` | — | The row's label. |

#### `SearchBarStatusProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `loading` | `boolean` | `false` | A spinner beside the line, for a search that is still running. |
| `children` | `ReactNode` | — | — |

#### `SearchBarActionProps`

Extends `AnimatedPressableProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `SearchBarTokenProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `leading` | `ReactNode` | — | Anything before the label — an avatar, a logo, a status dot. |
| `onRemove` | `() => void` | — | Fires when the chip's ✕ is pressed. Without it no ✕ is drawn. |
| `removeLabel` | `string` | — | How the ✕ announces itself. Defaults to `Remove <label>`. |
| `children` | `ReactNode` | — | The chip's label. |

### Example — Results above the keyboard

`avoidKeyboard` lifts the field until it sits `keyboardOffset` points clear of the keyboard, and the panel opens upward into the space that is left. Both are needed together: a panel that opens downward from a field that has not moved is a panel behind the keyboard.

```tsx
<SearchBar
  avoidKeyboard
  variant="filled"
  cancel="focus"
  placeholder="Search or enter company"
  value={query}
  onChangeText={setQuery}
>
  <SearchBar.Section label="Suggested">
    {COMPANIES.map((company) => (
      <SearchBar.Item
        key={company}
        trailing={
          <Pressable hitSlop={12} onPress={() => add(company)}>
            <PlusIcon size={18} />
          </Pressable>
        }
        onPress={() => add(company)}
      >
        {company}
      </SearchBar.Item>
    ))}
  </SearchBar.Section>
</SearchBar>
```

### Notes

### Where the panel opens, and why

The panel is welded to one edge of the field: `panelPlacement="top"`, the default, puts it above, and `"bottom"` below. Above is the default because the space under a focused field belongs to the keyboard, and it also puts the first result nearest the caret.

It is positioned absolutely rather than laid out in the flow, so opening it never moves the page underneath — a list that pushes the field it belongs to is a field that walks away from the finger typing into it. Its height is capped by the room it actually has between the field and the edge of the screen; pass `panelMaxHeight` to cap it lower.

### Touches inside the panel

Nothing pressed inside the panel closes the search. The panel keeps the keyboard through every tap, including the ones that land on padding, on the gap between two rows, on a section heading, or on `SearchBar.Status` — a search that ended because somebody tapped the word "Searching …" is a search that ended for no reason.

A press also holds the field's focus open for a moment afterwards. That covers the other way a touch can end a search: a control inside a row takes focus with the press on Android, and the field's blur closes the panel that control is standing in before the press has finished being served.

That second half only works for controls that go through the component. Use `SearchBar.Action` for a button in a row's `trailing` slot rather than a plain `Pressable` — the row cannot hold focus on behalf of something nested inside it, because the nested control takes the touch and the row never sees it.

### What has already been picked

`tokens` puts the choices made so far inside the field, before the caret, so the query and what it has produced are one control. `SearchBar.Token` is the chip; `onRemove` gives it a ✕.

They scroll rather than wrap, and take at most 60% of the field's width. The field is one line tall, and a row of chips allowed to grow it would move the caret every time something was picked.

`onRemoveLastToken` fires on backspace in an empty field — the gesture a token field answers everywhere else. It only fires when the field is empty: while there is a query, backspace is editing it.

`panel="focus"` shows it while the field is being typed into, `"always"` for a screen that is nothing but the search, and `"never"` ignores the children entirely.

### Getting clear of the keyboard

`avoidKeyboard` moves the field, the Cancel button and the panel together, and only while this field is the one being edited. Install `react-native-keyboard-controller` for it to behave on Android — see [useKeyboardAvoidance](/docs/hooks/use-keyboard-avoidance).

Do not toggle it at runtime. It changes which component wraps the row, so the field would remount and lose focus mid-search.

### The rest

When `disabled`, the field, clear button, Cancel button, panel and submit boundary are all inert. Cancel remains visible when `cancel="always"`, but leaves the focus order and cannot clear, blur, or call `onCancel`.

The clear button is drawn by the component rather than left to the platform's `clearButtonMode`, which exists on iOS only, cannot be labelled for a screen reader and cannot be swapped for a spinner. Clearing keeps the keyboard up, because emptying a query is usually the start of the next one; Cancel is the control that ends the search.

The glyph is 24 points and its touch box is 48, made up with slop rather than with size — a 48-point circle inside a 40-point field would either overflow it or force every search bar in the app to be as tall as the largest one.

`loading` replaces the clear button rather than joining it, since the two would otherwise collide at exactly the moment a query is both non-empty and running.

For a search with a label, a description and an error line, use `Field` around an `Input`. SearchBar drops that furniture on purpose: Cancel sits beside the field, and a label stacked above the field would leave it centred against the whole stack.

For a field that picks one value out of a list rather than running a search, use [Combobox](/docs/components/combobox).

Submitting cancels any pending debounce timer before immediately delivering the current query, so `onDebouncedChange` runs once for that submission rather than once now and again when the old pause expires. Non-positive or non-finite debounce values use the immediate path and never allocate a timer.

---

Full page, with every example: https://panelui.dev/docs/components/search-bar
