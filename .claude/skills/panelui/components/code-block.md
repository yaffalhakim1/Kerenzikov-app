# CodeBlock

A fenced snippet, syntax-coloured and scrolled sideways.

```tsx
import { CodeBlock } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { CodeBlock } from '@/components/ui/code-block';
```

### Usage

```tsx
<CodeBlock code={code} language="tsx">
  <CodeBlock.Header>
    <CodeBlock.Filename>calendar.tsx</CodeBlock.Filename>
    <CodeBlock.CopyButton />
  </CodeBlock.Header>
</CodeBlock>
```

### Parts

- `CodeBlock.Header` — The bar above the code: what the file is, and what can be done with it.
- `CodeBlock.Filename` — The file's name, in monospace.
- `CodeBlock.Language` — The language, for a block with no filename to name it by.
- `CodeBlock.Actions` — A row for the buttons at the trailing edge of the header.
- `CodeBlock.CopyButton` — Copies the block's code and ticks for two seconds. Needs `expo-clipboard`.

### Props

#### `CodeBlockProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `code` | `string` | **required** | The snippet. |
| `language` | `string` | — | What it is written in. `ts`, `tsx`, `js`, `jsx`, `json`, `bash`, `python`, `css`, `html`, `sql`, `markdown` and `diff` are coloured, along with the usual spellings of each; anything else renders as plain monospace. |
| `showLineNumbers` | `boolean` | `false` | Number the lines in a gutter down the leading edge. |
| `children` | `ReactNode` | — | A header, and anything else that goes above the code. |

#### `CodeBlockHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `CodeBlockFilenameProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `CodeBlockLanguageProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `CodeBlockActionsProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `CodeBlockCopyButtonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `timeout` | `number` | — | How long the tick stays up before turning back into the copy glyph. |
| `onCopy` | `() => void` | — | — |

### Example — A snippet with a header

`code` and `language` are the whole of it; everything in `children` is drawn above the code. A block with no children is just the code.

```tsx
<CodeBlock code={snippet} language="tsx">
  <CodeBlock.Header>
    <CodeBlock.Filename>calendar.tsx</CodeBlock.Filename>
    <CodeBlock.Actions>
      <CodeBlock.CopyButton />
    </CodeBlock.Actions>
  </CodeBlock.Header>
</CodeBlock>
```

### Notes

**The highlighter is deliberately small.** A real tokenizer is a grammar per language, which is megabytes and a worker — the wrong shape twice over here, because a chat renders fragments rather than files and the fragments arrive a token at a time, so whatever runs has to run again on every frame of a stream.

What it therefore does not do: nested languages, template-literal interpolation, or anything needing a parser to know. A block comment spanning several lines is coloured only on its first, because each line is tokenized on its own so that a stream which has just gained a character does not re-tokenize the whole block. What it does do is make a keyword look like a keyword, which is the whole of the value in a twelve-line snippet.

**A line is one `Text` with coloured runs inside it**, not a row of views. Only inside a single `Text` do the runs share a baseline and keep the spaces between them; a row of views gives every token its own box and the line comes apart at the seams.

**Colours are theme tokens.** `--color-code-keyword`, `-string`, `-number`, `-comment`, `-function`, `-property`, `-punctuation`, `-inserted` and `-deleted` are declared per theme and per light/dark. Override them after the theme import to put a snippet on your own palette.

**Copying needs `expo-clipboard`.** It is an optional peer, and the button is silent without it:

```sh
npx expo install expo-clipboard
```

---

Full page, with every example: https://panelui.dev/docs/ai-components/code-block
