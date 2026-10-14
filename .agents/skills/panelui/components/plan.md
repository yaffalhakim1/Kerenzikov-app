# Plan

What an agent intends to do, before it does it.

```tsx
import { Plan } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Plan } from '@/components/ui/plan';
```

### Anatomy

```tsx
<Plan>
  <Plan.Header>
    <Plan.Icon />
    <Plan.Title />
    <Plan.Description />
    <Plan.Action>
      <Plan.Progress />
      <Plan.Trigger />
    </Plan.Action>
  </Plan.Header>
  <Plan.Content>
    <Plan.Steps>
      <Plan.Step />
    </Plan.Steps>
  </Plan.Content>
  <Plan.Footer />
</Plan>
```

### Parts

- `Plan.Header` — The title, the description and whatever acts on them. The heading gets a column of its own, so an icon stays at the leading edge and an action at the trailing one as the title wraps.
- `Plan.Icon` — A badge on the header’s leading edge — what kind of plan this is.
- `Plan.Title` — The plan's name. Shimmers while `isStreaming`.
- `Plan.Description` — A line under it. Shimmers too.
- `Plan.Action` — Pinned to the header's trailing edge — the toggle, the count, a menu.
- `Plan.Progress` — How far down the rail the plan has got, as `2 of 4`. Counts itself from `Plan.Steps`, and renders nothing until there is a rail to count.
- `Plan.Trigger` — Folds the body away. Its chevron turns to point at the state it will reach.
- `Plan.Content` — The body. Collapses rather than unmounting, so it can still be growing.
- `Plan.Steps` — The rail. Counts its own steps and reports the count up to `Plan.Progress`.
- `Plan.Step` — One step, in one of four states. The marker says which; the rail below it fills once it is done.
- `Plan.Footer` — Where the buttons that answer the plan go. Each action takes an equal share of the row by default.

### Props

#### `PlanProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `isStreaming` | `boolean` | `false` | Whether the plan is still being written. Shimmers the title and description. |
| `open` | `boolean` | — | Controlled open state of the body. |
| `defaultOpen` | `boolean` | `true` | Initial state when uncontrolled. |
| `onOpenChange` | `(open: boolean) => void` | — | — |
| `children` | `ReactNode` | — | — |

#### `PlanHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PlanIconProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PlanTitleProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PlanDescriptionProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PlanActionProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PlanTriggerProps`

Extends `Omit<PressableProps, 'children' \| 'style'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PlanContentProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PlanStepsProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PlanStepProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `status` | `PlanStepStatus` | `pending` | How far this step has got. Decides the marker, the title and the rail below it. |
| `description` | `ReactNode` | — | A line under the title — what the step will touch, or what it found. |
| `meta` | `ReactNode` | — | A file path, a count, a duration. Rendered as a small mono chip. |
| `last` | `boolean` | — | Drop the connector below this step. `Plan.Steps` sets it for you. |
| `children` | `ReactNode` | — | — |

#### `PlanProgressProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `number` | — | Steps settled so far. Defaults to what `Plan.Steps` counted. |
| `total` | `number` | — | Steps in total. Defaults to what `Plan.Steps` counted. |

#### `PlanFooterProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `layout` | `'stretch' \| 'end'` | — | How the actions divide the row. `stretch` splits it between them, which is what a phone wants: the decision is the point of the card, and the two buttons that make it should be the width of a thumb. `end` packs them against the trailing edge for a plan sitting inside something denser. |
| `children` | `ReactNode` | — | — |

### Example — A rail of steps

The four statuses are `pending`, `active`, `done` and `skipped`. Only one step is usually `active`; the rail behind the finished ones is filled, which is what makes progress readable without counting. `meta` takes the file the step touches and renders it as a small mono chip.

```tsx
<Plan>
  <Plan.Header>
    <Plan.Icon>
      <ListChecksIcon size={16} />
    </Plan.Icon>
    <Plan.Title>Fix the calendar range</Plan.Title>
    <Plan.Description>Four files, no API change.</Plan.Description>
    <Plan.Action>
      <Plan.Progress />
      <Plan.Trigger />
    </Plan.Action>
  </Plan.Header>
  <Plan.Content>
    <Plan.Steps>
      <Plan.Step status="done" meta="utils/date.ts">
        Make the in-range test inclusive
      </Plan.Step>
      <Plan.Step status="done" meta="calendar/index.tsx">
        Round the band only where it stops
      </Plan.Step>
      <Plan.Step status="active">Square the discs against the band</Plan.Step>
      <Plan.Step meta="scripts/gen.mjs">Regenerate the docs page</Plan.Step>
    </Plan.Steps>
  </Plan.Content>
  <Plan.Footer>
    <Button variant="outline">Revise</Button>
    <Button>Approve</Button>
  </Plan.Footer>
</Plan>
```

### Notes

**The rail counts itself.** `Plan.Steps` reports how many of its steps are settled, which is what lets `Plan.Progress` sit up in the header — above the rail, with no way to reach it — without the total being stated twice. `done` and `skipped` both count as settled: a plan reporting *2 of 4* while two more were deliberately passed over is reporting the wrong thing. Pass `value` and `total` to `Plan.Progress` to override the count entirely.

**Only string children shimmer.** `Plan.Title`, `Plan.Description` and the `active` `Plan.Step` wrap text in a shimmer while `isStreaming`, and leave an element alone — an element may already be animating, and two animations over one heading is a mess rather than an emphasis.

**`Plan.Icon` and `Plan.Action` are lifted out of the heading column** by the header, to the leading and trailing edges respectively, so neither rides down with a title that wraps to a second line.

**The footer stretches its actions.** A pair of small buttons hugging the trailing corner is a pointer-and-cursor shape; here each action takes an equal share of the row so both clear a thumb. `layout="end"` gives you the packed arrangement for a plan sitting inside something denser.

**The body collapses rather than unmounting**, for the same reason as everywhere else here: a streaming plan is still growing while it is folded.

**Nothing here depends on the AI SDK.** `isStreaming` is a boolean; it happens to be `useObject`’s `isLoading`.

---

Full page, with every example: https://panelui.dev/docs/ai-components/plan
