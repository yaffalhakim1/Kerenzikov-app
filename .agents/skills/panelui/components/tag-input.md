# TagInput

A field whose value is a list of tokens rather than a string.

```tsx
import { TagInput } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { TagInput } from '@/components/ui/tag-input';
```

### Usage

```tsx
<TagInput
  label="Topics"
  value={topics}
  onValueChange={setTopics}
  placeholder="Add a topic"
  clearable
/>
```

### Variants

- **variant** — `outline` *(default)*, `filled`
- **size** — `sm`, `md` *(default)*, `lg`
- **disabled** — `true`

### Props

#### `TagInputProps`

Extends `Omit< TextInputProps, \| 'value' \| 'defaultValue' \| 'onChangeText' \| 'editable' \| 'multiline' \| 'children' >, Omit<TagInputVariantProps, 'disabled'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Classes for the field box — the bordered container the tags sit in. |
| `containerClassName` | `string` | — | Classes for the outer column that also holds the label and the error. |
| `value` | `string[]` | — | The tags, controlled. Pair it with `onValueChange`. |
| `defaultValue` | `string[]` | — | The tags to start with, when the field keeps its own value. |
| `onValueChange` | `(tags: string[]) => void` | — | Called with the whole list whenever a tag is added or removed. |
| `inputValue` | `string` | — | The text being typed, controlled. Only needed to drive the draft from outside — the tags themselves are `value`. |
| `onInputValueChange` | `(text: string) => void` | — | Called as the draft text changes, before it becomes a tag. |
| `label` | `string` | — | The label above the field, and what the input is announced as. |
| `description` | `string` | — | A line under the field, replaced by `errorMessage` when there is one. |
| `errorMessage` | `string` | — | Error message. When set, the field renders in its invalid state. |
| `isRequired` | `boolean` | — | Marks the field required — an asterisk on the label, and the a11y state. |
| `disabled` | `boolean` | `false` | Dims the field and stops it being reached at all. |
| `readOnly` | `boolean` | `false` | Shows the tags but takes away the input and the ✕ on each one. |
| `max` | `number` | — | The most tags the field accepts. Past it nothing more is committed and `onReject` is called with `'max'`, unless `allowOverflow` is set. |
| `allowOverflow` | `boolean` | `false` | Let the list go past `max` anyway. The field reports itself invalid while it is over, which is the point: some forms want the count shown as wrong rather than the typing refused. |
| `allowDuplicates` | `boolean` | `false` | Accept a tag the list already holds. Off by default. |
| `delimiters` | `string[]` | — | Characters that end a tag as they are typed. A comma by default, which is what makes a pasted `a, b, c` land as three tags rather than one. |
| `blurBehavior` | `TagBlurBehavior` | `add` | What happens to text still in the field when it loses focus. `add` commits it and clears it if it was accepted, leaving it in place if it was not, so a rejected word is still there to fix. `clear` drops it. `keep` leaves it exactly as typed. |
| `validate` | `(tag: string, tags: string[]) => boolean` | — | Decide whether a tag may be added, given the list it would join. Return `false` to turn it away — `onReject` is then called with `'invalid'`. |
| `onReject` | `(tag: string, reason: TagRejection) => void` | — | Called when a tag was turned away, with the reason it was. |
| `chipVariant` | `ChipVariant` | `default` | Which Chip variant the tags are drawn as. |
| `renderTag` | `(tag: string, index: number) => ReactNode` | — | Draw the tag yourself — an avatar before the label, a count after it. |
| `clearable` | `boolean` | `false` | A ✕ at the end of the field that empties it. |
| `showCount` | `boolean` | `false` | Shows `3 / 8` under the field. Needs `max`. |
| `haptics` | `boolean` | `false` | A tick under the finger as a tag lands or leaves. Off by default — needs the optional `expo-haptics`, and is silent without it. |

### Example — Typing tags

Return or a comma ends a tag. Backspace on an empty field marks the last one; a second backspace takes it.

```tsx
const [tags, setTags] = useState(['expo', 'reanimated']);

<TagInput
  label="Topics"
  value={tags}
  onValueChange={setTags}
  placeholder="Add a topic"
  description="Return or a comma ends a tag."
  clearable
/>
```

### Notes

### Three ways a tag gets committed

Return commits what has been typed. So does any of `delimiters` — a comma by default — which is what makes pasting `design, research, ops` land as three tags rather than one long one. Pass several to accept more than one separator, or `delimiters={[]}` to make return the only way in.

`blurBehavior` decides what a field that loses focus mid-word does with the leftover. `add` (the default) commits it and clears it *if it was accepted*, leaving it in place if it was not, so a rejected word is still there to fix. `clear` drops it. `keep` leaves it exactly as typed.

Every tag is trimmed, and empty text is never committed — so a trailing comma adds nothing.

### Backspace asks first

Backspace on an empty field marks the last tag rather than taking it: the tag turns `destructive`, and a second backspace removes it. A held backspace repeats, and a field that deleted on the first one would empty itself in the time it takes to notice — the mark is the beat that lets you stop. Typing anything, or leaving the field, takes the mark off again. A controlled `value` replacement or reorder also clears it, so a mark armed for the old list can never remove a tag that arrived in its place.

[Combobox](/docs/components/combobox) in `multiple` mode does the same with its chips, so the reflex carries between the two.

### Turning a tag away

Three rules can refuse a tag, and each one calls `onReject` with the reason it did:

- `duplicate` — the list already holds it. Set `allowDuplicates` to accept it anyway. The comparison is exact, so `Design` and `design` are two different tags.
- `max` — the list is full. `allowOverflow` lets it go past the limit instead, and the field then reports itself invalid while it is over, which is the point: some forms want the count shown as wrong rather than the typing refused.
- `invalid` — `validate` returned `false` for it, given the list it would have joined.

Nothing is announced on its own. `onReject` exists because a tag that is silently dropped is indistinguishable from one that was never finished — pair it with `errorMessage` to say what happened.

### The value, and the draft

`value` is the tags; `inputValue` is the text still being typed. Both are optional and both fall back to state the field keeps itself, so the common case controls the tags alone and never touches the draft.

`showCount` puts `3 / 8` under the field and turns `destructive` once the list is over `max`. It needs `max` — a count with no limit to count towards says nothing.

### Read-only and disabled

`readOnly` keeps the tags and takes away the input and the ✕ on each one, which is the right shape for a summary of a filter someone else set. `disabled` dims the whole field and stops it being reached at all.

---

Full page, with every example: https://panelui.dev/docs/components/tag-input
