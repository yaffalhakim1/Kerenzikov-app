# Response

A model's answer, rendered as markdown while it is still arriving.

```tsx
import { Response } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Response } from '@/components/ui/response';
```

### Usage

```tsx
<Response isStreaming={status === 'streaming'}>{text}</Response>
```

### Props

#### `ResponseProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `string` | `` | The markdown. |
| `isStreaming` | `boolean` | `false` | Whether more is still coming. Finishes an unterminated construct at the end of the text instead of escaping it, so the answer does not flicker between styles as its delimiters arrive. |
| `parseIncompleteMarkdown` | `boolean` | `true` | Turns off speculative completion entirely, even while streaming. |
| `onLinkPress` | `(href: string) => void` | — | What a link does. Opens it with the system handler by default. |
| `allowedLinkPrefixes` | `string[]` | `['https://', 'http://', 'mailto:', 'tel:']` | Schemes a link is allowed to open. A model can write any URL it likes, and an answer is not a trusted document — so the default list is the four that cannot do anything but navigate. |
| `components` | `ResponseComponents` | — | Swap out how a block is drawn. |
| `showLineNumbers` | `boolean` | `false` | Line numbers in fenced code. |

### Example — An answer

Headings, lists, a quote, a fence and a table — the whole surface. Each block is drawn by the component that already knows how: a fence becomes a `CodeBlock` with its own copy button and sideways scroll, a table becomes a real `Table`.

```tsx
const answer = `## Paying down a card

1. **Avalanche** — highest rate first. Costs the least overall.
2. **Snowball** — smallest balance first. Closes an account soonest.

> Pick the one you will still be doing in six months.

\`\`\`ts
const order = cards.slice().sort((a, b) => b.apr - a.apr);
\`\`\`
`;

<Response>{answer}</Response>
```

### Notes

### What it reads

Headings, paragraphs, fenced code with an info string, blockquotes, ordered and unordered lists nested by indent, GFM tables with per-column alignment, thematic breaks. Inline: `**bold**`, `*italic*`, `` `code` ``, `~~strikethrough~~`, links, and backslash escapes.

Not a general Markdown implementation, and not trying to be. It reads what a model writes.

### Half-arrived markdown

The rule the reader works to is that **no word already on screen may disappear when the next token arrives.** Delimiters may vanish as they are recognised — that is what recognising them means — but words never do.

What that buys, concretely:

- An unterminated ``` fence renders as a code block that is still filling, not as literal backticks that later vanish and take the snippet's first line with them.
- A trailing `**bo` renders as bold text, so the words do not flash unstyled and then restyle a token later.
- A half-typed `[label](htt` shows its label and nothing else, so the text does not jump when the closing paren lands.
- A lone trailing `#` or `-` is not promoted to a heading or a list until a space and some content follow it.
- A table's header row stays a paragraph until its divider arrives, because until then it is a paragraph with pipes in it.

Only the *tail* is treated this way. An unterminated `**` in the middle of a finished paragraph is two asterisks, because a document that has stopped arriving means what it says. Set `parseIncompleteMarkdown={false}` to turn the speculation off entirely.

### Links are not trusted

A model can write any URL it likes, and an answer is not a trusted document. A link only becomes pressable if its href starts with one of `allowedLinkPrefixes`, which defaults to `https://`, `http://`, `mailto:` and `tel:` — the four that cannot do anything but navigate. Anything else still renders as text; it just does nothing. Pass `onLinkPress` to route links through your own navigator instead of the system handler.

### It re-renders on the text and nothing else

A stream re-renders its parent on every token, and the callbacks and overrides that parent passes down are usually fresh objects each time. `Response` compares the text, the streaming flag and the class name, so a long answer does not re-parse because a sibling moved. Tokenising is memoised on the string as well.

### Column widths are even

A markdown table carries no widths. Guessing them from the longest cell makes the columns jump about as rows stream in, which is exactly the movement everything else here exists to avoid — so every column takes the same share.

### Everything renders inside the text flow

React Native will not render a bare string outside a `Text`, and it lays out a view inside one by breaking the line before it. Both are easy to trip over here, because a paragraph is a `Text` and a table cell is a view — so inline code is a styled `Text` with a background rather than the boxed `Typography.Code`, and a table cell wraps its run in a `Text` of its own.

It matters for the `components.image` override too: it is rendered inside a paragraph's text run, so return a `Text` or an `Image` from it. A `View` will break the sentence around it.

---

Full page, with every example: https://panelui.dev/docs/ai-components/response
