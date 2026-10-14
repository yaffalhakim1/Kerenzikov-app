# MarkdownEditor

A field for writing markdown, with a formatting toolbar and a rendered preview.

```tsx
import { MarkdownEditor } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { MarkdownEditor } from '@/components/ui/markdown-editor';
```

### Anatomy

```tsx
<MarkdownEditor>
  <MarkdownEditor.Toolbar />   {/* formatting, and the write/preview switch */}
  <MarkdownEditor.Input />     {/* draws while writing */}
  <MarkdownEditor.Preview />   {/* draws while previewing */}
</MarkdownEditor>
```

### Variants

- **variant** — `bar` *(default)*, `pill`

### Parts

- `MarkdownEditor.Toolbar` — The formatting actions and the switch between writing and reading. `variant` chooses the drawing: `bar` is the full-width row, `pill` the floating capsule. `actions` chooses which actions appear and in what order; `showModeSwitch` drops the switch for an editor with no preview. The bar takes children too, which land beside the switch — a word count, a save state, a submit.
- `MarkdownEditor.Input` — The field the markdown is written in — a `Textarea`, so everything that accepts applies. It renders nothing while the preview is up.
- `MarkdownEditor.Preview` — The draft, rendered. It renders nothing while the field is up, which is what makes the two one pane rather than two.

### Props

#### `MarkdownEditorProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `string` | — | Controlled text. Leave unset and pass `defaultValue` to run uncontrolled. |
| `defaultValue` | `string` | `` | Starting text when uncontrolled. |
| `onValueChange` | `(value: string) => void` | — | — |
| `mode` | `MarkdownEditorMode` | — | Controlled pane. |
| `defaultMode` | `MarkdownEditorMode` | `write` | Starting pane when uncontrolled. |
| `onModeChange` | `(mode: MarkdownEditorMode) => void` | — | — |
| `disabled` | `boolean` | `false` | Stop the field being edited and the formatting actions being pressed. The switch between the panes stays live: a draft nobody may edit is still a draft somebody may want to read rendered. |
| `children` | `ReactNode` | — | The parts, in the order they should stack. Left out, the editor draws its toolbar, its field and its preview in that order — which is the whole component, and the reason it usually needs no children. |
| `placeholder` | `string` | — | Forwarded to the field when the editor draws its own. |
| `rows` | `number` | — | Height of the field, in lines. Forwarded to the field the editor draws. |
| `avoidKeyboard` | `boolean` | — | Lift the editor above the keyboard. Forwarded to the field the editor draws, and off by default because it changes which component renders the container — so it cannot be toggled at runtime without remounting the field and dropping focus. |
| `continueLists` | `boolean` | `true` | Continue a list when Return is pressed inside one, and end it when Return is pressed on an item with nothing in it. On by default: a list that stops numbering itself after the first item is a list the writer finishes by hand. |

#### `MarkdownEditorToolbarProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `variant` | `MarkdownEditorToolbarVariant` | `bar` | How the toolbar is drawn. `bar` is the full-width row, with room on it for a word count or a submit. `pill` is the floating capsule: icon-only, grouped by hairlines, with the pane switch as a round button beside it. |
| `actions` | `MarkdownEditorAction[]` | — | Which formatting actions to offer, in the order given. The capsule groups whatever it is given by family — what the words look like, what is being put into the document, what shape the block is — and draws a hairline where the family changes. |
| `showModeSwitch` | `boolean` | `true` | Show the write/preview switch. On by default — a preview nobody can reach is a pane that does not exist. |
| `children` | `ReactNode` | — | Anything else to put on the row: a word count, a save state, a submit. The capsule has no room for these, so a toolbar with children wants `bar`. |

#### `MarkdownEditorInputProps`

Extends `Omit<TextareaProps, 'value' \| 'onChangeText' \| 'defaultValue'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `MarkdownEditorPreviewProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `emptyText` | `string` | — | What to show when there is nothing written yet. |

### Example — The whole component

No children: the toolbar, the field and the preview in that order. `rows` sizes the field and `placeholder` goes to it.

```tsx
const [draft, setDraft] = useState('');

<MarkdownEditor
  value={draft}
  onValueChange={setDraft}
  rows={10}
  placeholder="Write something…"
/>
```

### Notes

### What is already applied

A button whose action is in effect where the caret is draws as pressed. Every formatting button is a toggle, and a toggle that looks the same in both states is a toggle nobody discovers is one — the rule below about pressing twice is only useful if the first press is visible.

The check runs when the caret moves or an action is applied, not on every keystroke: typing a letter cannot change what is applied at the caret, and eight predicates over the whole document per character is work nobody asked for.

### Where the caret lands

Every toolbar button is a function of the text and where the caret is in it, and what makes a formatting toolbar feel broken is never the characters it inserts — it is where the caret ends up afterwards. Three rules hold for all of them:

- **Pressing twice undoes it.** A button that only ever adds is a button you can press once, and every press after that damages the text.
- **A selection stays selected.** Bolding three words and then italicising the same three is two presses, not a press and a re-selection.
- **With nothing selected, the caret lands where the writing goes** — between the new markers rather than after them.

A line-level action — heading, list, quote — applies to every line the selection touches, even partly, and removes itself only when *all* of them already have it. A mixed block is a block someone is trying to make uniform, so the useful answer there is to add.

After one, the caret keeps its distance from the **end** of its line rather than from the start. These actions change what sits in front of the text, so a caret held at the same column lands inside the bullet it just gained.

An inline marker never spans a line break: a selection crossing one is wrapped line by line, because `**one\ntwo**` is bold in no reader at all.

### Return continues a list

Inside `- item` or `1. item`, Return starts the next item at the same indent, and numbered lists count on. On an item with nothing in it, Return ends the list — a writer pressing Return on an empty bullet has run out of items, and the alternative is a trail of empty bullets to delete by hand. Turn it off with `continueLists={false}`.

It is read off the text change rather than off the key, because a key event in a React Native field cannot be prevented: acting on the key would insert the marker *and* the line break the field was always going to add.

### The field is monospaced, and does not correct you

A markdown source is code as much as it is prose. Autocapitalisation and autocorrection are off, because an editor that capitalises the word after a fence, or rewrites a hyphen into an en dash, is an editor that quietly changes what the document renders as.

### No platform markdown

SwiftUI's `Text` can parse markdown and Jetpack Compose's cannot, so an editor backed by the platform would render on iOS and show a plain string on Android. The parser here is JavaScript and the output is React Native views, which is why the two platforms agree.

---

Full page, with every example: https://panelui.dev/docs/components/markdown-editor
