# Steps

Stepper for multi-step flows.

```tsx
import { Steps } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Steps } from '@/components/ui/steps';
```

### Anatomy

```tsx
<Steps>
  <Steps.Item step={0}>
    <Steps.Trigger>
      <Steps.Indicator />
      <Steps.Title>…</Steps.Title>
      <Steps.Description>…</Steps.Description>
    </Steps.Trigger>
  </Steps.Item>
</Steps>
```

### Variants

- **orientation** — `horizontal` *(default)*, `vertical`
- **state** — `inactive` *(default)*, `active`, `completed`, `loading`
- **isDisabled** — `true`

### Parts

- `Steps.Item` — One step. `step` is its zero-based position.
- `Steps.Trigger` — Makes the item selectable. Accepts Pressable props and composes `onPress` before selection. Omit it for a read-only stepper.
- `Steps.Indicator` — The circle — step number, a check once complete, a spinner while loading.
- `Steps.Title` — Step heading.
- `Steps.Description` — Supporting line.
- `Steps.Separator` — Connector to the next step. Every item draws one already — write it only to dress a particular connector, inside the item whose state it reads.

### Props

#### `StepsProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `defaultValue` | `number` | `0` | Active step when uncontrolled. |
| `value` | `number` | — | Active step, controlled. |
| `onValueChange` | `(value: number) => void` | — | — |
| `orientation` | `StepsOrientation` | `horizontal` | — |
| `separators` | `boolean` | `true` | Draw the connector between one item and the next. On by default — an item that holds its own `Steps.Separator` is left alone either way, so this is for a stepper that wants no connectors at all rather than for one that places them by hand. |
| `children` | `ReactNode` | — | — |

#### `StepsItemProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `step` | `number` | **required** | This item's position in the flow, zero-based by convention. |
| `completed` | `boolean` | — | Force the completed state, regardless of the active step. |
| `disabled` | `boolean` | — | — |
| `loading` | `boolean` | — | Shows a spinner in place of the number while this step is active. |
| `children` | `ReactNode` | — | — |

#### `StepsTriggerProps`

Extends `PressableProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `StepsIndicatorProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | Replaces the number / check / spinner entirely. |

#### `StepsSeparatorProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

### Example — A horizontal wizard

`value` is the index of the current step; anything before it is completed. The connector between one item and the next comes with the item.

```tsx
const [step, setStep] = useState(1);

<Steps value={step} onValueChange={setStep}>
  <Steps.Item step={0} className="flex-1">
    <Steps.Trigger>
      <Steps.Indicator />
      <Steps.Title>Account</Steps.Title>
    </Steps.Trigger>
  </Steps.Item>
  <Steps.Item step={1} className="flex-1">
    <Steps.Trigger>
      <Steps.Indicator />
      <Steps.Title>Payment</Steps.Title>
    </Steps.Trigger>
  </Steps.Item>
  <Steps.Item step={2}>
    <Steps.Trigger>
      <Steps.Indicator />
      <Steps.Title>Confirm</Steps.Title>
    </Steps.Trigger>
  </Steps.Item>
</Steps>
```

### Notes

Steps are zero-based internally but the indicator renders them as 1, 2, 3.

`Steps.Trigger` accepts the normal Pressable contract. Its `onPress` runs before the step selection callback, while selection, the button role, position/state announcement, and an item-level `disabled` state remain owned by Steps. A trigger-level `disabled` prop combines with the item instead of re-enabling it.

The connectors are drawn for you: the root counts the items it holds and every one but the last joins to the next, so there is no separator to forget or leave dangling. Pass `separators={false}` for a stepper with none, or put a `Steps.Separator` inside an item to dress that one connector yourself — an item that has its own keeps it and gets no second.

Knowing the count is also what lets a step say where it sits: a screen reader reaching the middle of a wizard hears the step's title, then its position and state — “Payment, step 2 of 3, completed”.

---

Full page, with every example: https://panelui.dev/docs/components/steps
