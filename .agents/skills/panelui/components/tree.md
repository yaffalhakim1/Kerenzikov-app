# Tree

A hierarchy you can open a level at a time.

```tsx
import { Tree } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Tree } from '@/components/ui/tree';
```

### Anatomy

```tsx
<Tree>
  <Tree.Item value="…">
    <Tree.Trigger>
      <Tree.Indicator />
      <Tree.Icon>…</Tree.Icon>
      <Tree.Label>…</Tree.Label>
      <Tree.Actions>…</Tree.Actions>
    </Tree.Trigger>
    <Tree.Group>
      <Tree.Item value="…">…</Tree.Item>
    </Tree.Group>
  </Tree.Item>
</Tree>
```

### Variants

- **size** — `sm`, `default` *(default)*
- **isSelected** — `true`
- **isDisabled** — `true`

### Parts

- `Tree.Item` — One node. Its `value` identifies it in both the expanded and the selected state, and its depth is read from how deeply it is nested rather than declared.
- `Tree.Trigger` — The node's row, and the thing you press. Pressing it selects the node, and opens it too unless `expandOnPress` is off. Standard Pressable props are forwarded; a supplied `onPress` runs after the tree has handled expansion and selection.
- `Tree.Indicator` — The chevron, which turns a quarter circle while the branch is open. It is pressable in its own right, so it opens a branch without selecting it. On a leaf it becomes an empty box of the same size, keeping the labels aligned.
- `Tree.Icon` — The leading glyph, between the chevron and the label. It holds its width whether or not you fill it, which is what keeps a folder's name and a file's name starting at the same place — so give every row in a tree an icon, or give none of them one. A row with an empty slot is the odd one out: its label sits a whole box away from its own chevron while the rows around it look right.
- `Tree.Label` — The row's text.
- `Tree.Actions` — The trailing slot: a count, a badge, a menu button for the node.
- `Tree.Group` — The rows inside a branch — and the reason its item is a branch. Unmounts when the branch is closed.

### Props

#### `TreeProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `size` | `TreeSize` | `default` | Row density. `sm` for a sidebar or a picker inside a sheet. |
| `selectionMode` | `TreeSelectionMode` | `none` | Whether a row can be the chosen one, and how many can be at once. |
| `value` | `string \| string[]` | — | Selected value(s), controlled. An array when `selectionMode` is `multiple`. |
| `defaultValue` | `string \| string[]` | — | — |
| `onValueChange` | `(value: string \| string[]) => void` | — | Handed back in the shape it was given — a string when single, an array when multiple. |
| `expanded` | `string[]` | — | Values of the open branches, controlled. |
| `defaultExpanded` | `string[]` | — | — |
| `onExpandedChange` | `(expanded: string[]) => void` | — | Fires with the next set of open branches — the hook to load a branch's children on. |
| `expandOnPress` | `boolean` | `true` | Whether pressing anywhere on a branch's row opens it, as well as selecting it. Turn it off when selecting a branch has to be possible without opening it; the chevron still opens it either way. |
| `showLines` | `boolean` | `false` | Draw a hairline down each level, connecting a branch to the rows inside it. |
| `indent` | `number` | `16` | How far one level is drawn in from its parent, in points. |
| `children` | `ReactNode` | — | — |

#### `TreeItemProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `string` | **required** | Identifies this node in the tree's expanded and selected state. |
| `isDisabled` | `boolean` | — | — |
| `hasChildren` | `boolean` | — | Marks the item as a branch when it has no `Tree.Group` to be detected by — a folder whose contents are fetched the first time it is opened. It gets a chevron, and opening it fires `onExpandedChange` with nothing to show yet. |
| `children` | `ReactNode` | — | — |

#### `TreeTriggerProps`

Extends `Omit<PressableProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `TreeIndicatorProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | Replaces the default chevron. It is rotated for you while the branch is open. |

#### `TreeIconProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `TreeActionsProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `TreeGroupProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

### Example — A file tree

The default. `defaultExpanded` names the branches that start open; everything below a closed one has not rendered at all. Folders take a glyph of their own rather than an empty `Tree.Icon`, so a folder's name starts where the names of the files under it do.

```tsx
<Tree defaultExpanded={['src']}>
  <Tree.Item value="src">
    <Tree.Trigger>
      <Tree.Indicator />
      <Tree.Icon><FolderOpenIcon size={15} /></Tree.Icon>
      <Tree.Label>src</Tree.Label>
    </Tree.Trigger>
    <Tree.Group>
      <Tree.Item value="src/index.ts">
        <Tree.Trigger>
          <Tree.Indicator />
          <Tree.Icon><FileIcon size={14} /></Tree.Icon>
          <Tree.Label>index.ts</Tree.Label>
        </Tree.Trigger>
      </Tree.Item>
    </Tree.Group>
  </Tree.Item>
</Tree>
```

### Notes

Expansion and selection are separate pieces of state, because a tree commonly needs one without the other. Expansion is `expanded` / `defaultExpanded` / `onExpandedChange` and is always an array. Selection is `value` / `defaultValue` / `onValueChange`, is off until you set `selectionMode`, and hands its value back in the shape you gave it — a string when `single`, an array when `multiple`.

The rows are laid out with `paddingStart` and a start-edge border rather than left-hand ones, so a tree in a right-to-left subtree indents away from the correct edge.

Because a closed branch is unmounted, the work a tree does is proportional to the rows on screen. A single branch holding thousands of open rows is the case that is not covered: render that one inside a virtualised list of your own.

---

Full page, with every example: https://panelui.dev/docs/components/tree
