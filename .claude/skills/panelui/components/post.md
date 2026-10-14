# Post

A social card — author, body, media and the counts underneath, with the votes animated.

```tsx
import { Post } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Post } from '@/components/ui/post';
```

### Anatomy

```tsx
<Post>
  <Post.Header>
    <Post.Author />
    <Post.Community />
    <Post.Action />
  </Post.Header>
  <Post.Title />
  <Post.Body />
  <Post.Media />
  <Post.Footer>
    <Post.Votes />
    <Post.Stat />
  </Post.Footer>
</Post>
```

### Variants

- **variant** — `feed` *(default)*, `vote`, `compact`, `media`
- **size** — `default` *(default)*, `sm`

### Parts

- `Post.Header` — The author row. `Post.Action` is pulled to the trailing edge, so an overflow menu stays in the corner as a long display name wraps.
- `Post.Author` — Who posted it — avatar, name, optional handle, verification rosette and a timestamp.
- `Post.Action` — The header's trailing slot — an overflow menu, a follow button, a badge.
- `Post.Community` — The group a post was made in, for a ranked feed where the headline is the subject and the group is only where it came from.
- `Post.Title` — The headline of a post whose subject is a headline rather than a person.
- `Post.Body` — What was written. Hashtags and mentions inside a string child are picked out and coloured.
- `Post.Media` — The picture, at a fixed aspect ratio so a feed of cards does not scroll like a broken staircase.
- `Post.Footer` — The row of counts and controls underneath.
- `Post.Stat` — One count, and the control that changes it. Pops, fills and moves its number.
- `Post.Votes` — The score and the two arrows that move it.

### Props

#### `PostProps`

Extends `Omit<ViewProps, 'children'>, VariantProps<typeof postVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `variant` | `PostVariant` | `feed` | Which of the four shapes. |
| `size` | `'default' \| 'sm'` | `default` | `sm` tightens the type for a card in a sidebar or a preview. |
| `onPress` | `PressableProps['onPress']` | — | Opening the post itself. The parts inside keep their own presses. |
| `children` | `ReactNode` | — | — |

#### `PostHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PostAuthorProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `name` | `string` | **required** | Display name. |
| `handle` | `string` | — | `@handle`, shown beside the name in `compact` and under it elsewhere. |
| `avatar` | `ImageSourcePropType` | — | — |
| `fallback` | `string` | — | Initials behind a missing or broken avatar. |
| `verified` | `boolean` | — | Draws the verification rosette after the name. |
| `timestamp` | `ReactNode` | — | "Posted 3m ago" — whatever the caller wants to call the time. |
| `children` | `ReactNode` | — | — |

#### `PostActionProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PostCommunityProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `name` | `string` | **required** | The group's name — "r/reactnative", "#design". |
| `avatar` | `ImageSourcePropType` | — | — |
| `meta` | `ReactNode` | — | How long ago, and anything else that belongs on the line. |
| `children` | `ReactNode` | — | — |

#### `PostTitleProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PostBodyProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `numberOfLines` | `number` | — | How many lines before it is cut off. Unlimited by default. |
| `onTagPress` | `(tag: string) => void` | — | Called with the tag, without its `#`. Makes hashtags pressable. |
| `onMentionPress` | `(handle: string) => void` | — | Called with the handle, without its `@`. |
| `children` | `ReactNode` | — | — |

#### `PostMediaProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `source` | `ImageSourcePropType` | **required** | — |
| `aspectRatio` | `number` | `16 / 10` | Width over height. `16 / 10` by default — wide enough not to eat the feed. |
| `scrim` | `'none' \| 'top' \| 'bottom' \| 'both'` | — | Darkens an edge of the image so type laid over it stays legible. A gradient rather than a panel: a flat rectangle over the top of a photograph has an edge of its own, and that edge reads as a bar covering the picture rather than as shading. `media` posts default to `top`, where the author sits; everything else to `none`. |
| `overlay` | `ReactNode` | — | Laid over the image: an expand affordance, a duration, a gallery count. |
| `alt` | `string` | — | Described for a screen reader. An image with nothing to say is decorative. |
| `onPress` | `PressableProps['onPress']` | — | — |
| `children` | `ReactNode` | — | — |

#### `PostFooterProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PostStatProps`

Extends `Omit<PressableProps, 'children' \| 'style'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `icon` | `ComponentType<IconProps & { filled?: boolean }>` | — | The icon component itself, not an element — it is re-rendered on toggle. |
| `value` | `ReactNode` | — | The number, or a word where a number would be meaningless ("Save"). |
| `active` | `boolean` | `false` | Lit, and filled. |
| `tone` | `'default' \| 'like' \| 'save' \| 'repost'` | `default` | Which colour "lit" is. |
| `align` | `'start' \| 'end'` | `start` | Pushes this stat and everything after it to the trailing edge. |
| `children` | `ReactNode` | — | — |

#### `PostVotesProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `score` | `number \| string` | **required** | The score as it stands, with the reader's own vote already in it. |
| `vote` | `PostVote` | `null` | Which way this reader voted, if either. |
| `onVote` | `(vote: PostVote) => void` | — | Called with the new vote. Pressing the arrow already cast clears it, so `null` arrives as often as the other two — a vote you cannot take back is a vote people hesitate over. |
| `orientation` | `'horizontal' \| 'vertical'` | `horizontal` | `vertical` stacks the arrows beside a thumbnail, the way a ranked list reads. |
| `disabled` | `boolean` | `false` | — |

### Example — Feed card

The full shape. Every count in the footer is live: `active` fills the icon and takes the tone colour, and passing the changed `value` alongside it is what makes the number move. `tone` is which colour lit means — a like is red, a save the accent, a repost green.

```tsx
<Post variant="feed">
  <Post.Header>
    <Post.Author name="Dwayne F. White" verified timestamp="Posted 3m ago" avatar={face} />
    <Post.Action><EllipsisIcon size={18} /></Post.Action>
  </Post.Header>

  <Post.Body>
    What debt strategies have you found effective? #FinancialFreedom
  </Post.Body>

  <Post.Media source={photo} alt="A coin going into a piggy bank" />

  <Post.Footer>
    <Post.Stat icon={EyeIcon} value="5,874" />
    <Post.Stat
      icon={HeartIcon}
      tone="like"
      active={liked}
      value={liked ? 216 : 215}
      onPress={() => setLiked((on) => !on)}
    />
    <Post.Stat icon={MessageCircleIcon} value="11" onPress={openReplies} />
    <Post.Stat icon={BookmarkIcon} tone="save" align="end" value="Save" onPress={save} />
  </Post.Footer>
</Post>
```

### Notes

### The number is the point

Every control in the footer is a toggle over a count, and a like that lights up while `215` sits there has not told you it counted. So a value that changes animates: the new number arrives from the direction the count travelled — rising into place when it went up, dropping in when it came down — while the old one fades.

Only the arriving half carries the direction. The number leaving was rendered before anyone knew which way the count would go, so asking it to animate knowingly would mean knowing the future.

A value that is not a number cross-fades instead, since there is no direction for the word "Save" to travel in. All of it is skipped under Reduce Motion, where the value simply changes.

### State stays with you

Nothing here keeps a count. `active`, `value`, `vote` and `score` are all yours, because the moment a like is optimistic — and it always is — the component's copy and the server's answer are two different things and only you know how to reconcile them. What the component owns is what a press *looks* like.

### Toggles fill rather than swap

The like, save, repost and vote icons take a `filled` prop and are the same shape in both states. Drawn as two different icons they would change shape under the finger; drawn as one that fills, the shape stays put and only the inside changes.

### Media has a fixed aspect ratio

`Post.Media` crops to `aspectRatio` — `16 / 10` by default — rather than following the image's own proportions. A feed whose card heights are decided by whatever was uploaded scrolls like a broken staircase, and a reader who has learnt where the like button sits loses it on every card.

Keep it wide. A portrait ratio makes one card most of a screen, and a feed you can only see one item of is a feed nobody scrolls — `4 / 3` is about as tall as a card should get before the next one stops hinting that it exists.

### The scrim is a gradient, not a panel

`scrim` darkens an edge of the image so type laid over it stays legible. It is on by default in the `media` variant, where the author sits over the picture, and off everywhere else.

It is a gradient over a fixed 112 points rather than a flat rectangle, and rather than a fraction of the image. A flat panel has an edge of its own, and that edge reads as a bar covering the photograph rather than as shading; a fraction of a tall portrait shades half the picture to do a job that needs its top inch.

### The overflow menu sits on the name

`Post.Action` is as tall as the name's own line box and the author block is top-aligned, so the menu lands on the username's line in all four variants rather than drifting between the two lines of the author block as the variant changes what is underneath the name.

### Accessibility

Each stat is a button carrying its selected state, and every target has `hitSlop` around it — the footer is dense enough that spacing the controls far enough apart to be hit reliably would make it twice as wide as the numbers in it. `Post.Votes` announces itself as adjustable with the score as its value, and each arrow is a button of its own. `Post.Media` is only described to a screen reader when you pass `alt`; an image with nothing to say is decorative and better skipped.

`Post` and `Post.Media` forward props for the branch they render, while retaining ownership of their computed classes/layout and—when interactive—the link or image-button role and primary press handler.

---

Full page, with every example: https://panelui.dev/docs/components/post
