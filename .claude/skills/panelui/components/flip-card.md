# FlipCard

Two faces of one card, and a turn between them.

```tsx
import { FlipCard } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { FlipCard } from '@/components/ui/flip-card';
```

### Anatomy

```tsx
<FlipCard>
  <FlipCard.Front />
  <FlipCard.Back />
</FlipCard>
```

### Parts

- `FlipCard.Front`
- `FlipCard.Back`

### Props

#### `FlipCardProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | `FlipCard.Front` and `FlipCard.Back`, in either order. |
| `direction` | `FlipCardDirection` | `horizontal` | Which axis the card turns about. `horizontal` turns it left to right about its vertical axis; `vertical` turns it top over bottom. |
| `rotation` | `FlipCardRotation` | `normal` | Which way round the turn goes. `reverse` sends it the other way, for a pair of cards that should not turn identically. |
| `flipped` | `boolean` | — | Which face is showing, when the caller holds it. Leave unset to let the card keep its own, and pair with `trigger="none"` for a card flipped only from outside. |
| `defaultFlipped` | `boolean` | `false` | Which face an uncontrolled card starts on. |
| `onFlippedChange` | `(flipped: boolean) => void` | — | Fires whenever the card settles on the other face, however it got there. |
| `trigger` | `FlipCardTrigger` | `press` | What turns the card. `press` is a tap anywhere on it; `drag` turns it with the finger and springs to whichever face is nearer on release; `none` leaves it to `flipped`. |
| `perspective` | `number` | `1000` | How deep the turn looks, in points. Smaller is more dramatic — the near edge swings further out — and below about 400 a full card starts to read as a door rather than a card. |
| `className` | `string` | — | Classes for the card's own box. The front's size is the card's size. |

#### `FlipCardFaceProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

### Example — A bank card

The case the component exists for. The number, the holder and the expiry are on the front; the stripe and the security code are on the back, because that is where they are on the object — which is the whole test for whether something should be a flip card at all.

The height is on the root, so both faces are handed the same box.

The issuer's mark sits opposite the name, tinted to `--color-primary-foreground` rather than swapped for a light and a dark file: the face is `bg-primary` in every theme, and that is the token which reads against it.

```tsx
<FlipCard className="h-[200px] w-full">
  <FlipCard.Front className="h-full justify-between rounded-2xl bg-primary p-5">
    <View className="flex-row items-center justify-between">
      <Text className="text-primary-foreground">PanelUI Bank</Text>
      <Image
        source={require('./assets/logo.png')}
        style={{ width: 26, height: 26, tintColor: brandMark }}
        resizeMode="contain"
        accessibilityLabel="PanelUI"
      />
    </View>
    <Text size="xl" className="tracking-[3px] text-primary-foreground">
      4242 4242 4242 4242
    </Text>
    <View className="flex-row justify-between">
      <Text size="sm" className="text-primary-foreground">K. ABDI</Text>
      <Text size="sm" className="text-primary-foreground">09/29</Text>
    </View>
  </FlipCard.Front>
  <FlipCard.Back className="h-full rounded-2xl bg-surface-secondary py-5">
    <View className="h-10 w-full bg-foreground/80" />
    <View className="mt-5 flex-row items-center justify-end gap-3 px-5">
      <Text size="sm" muted>CVC</Text>
      <View className="rounded-md bg-background px-3 py-1">
        <Text className="font-mono">829</Text>
      </View>
    </View>
  </FlipCard.Back>
</FlipCard>
```

### Notes

### Both faces are hidden twice

`backfaceVisibility` is the mechanism, and it is not reliable on every Android surface. So the face that has turned away is also faded out and dropped behind at the halfway point, off the same value that drives the turn. Two mechanisms for one job, because the failure of the first is a card showing both faces mirrored through each other and nothing in the tree that says why.

### Under reduce motion

The faces swap with no turn at all — not a shorter turn, none. The rotation is the part that moves and moving is what the setting is about; which face is showing is the information, and it is kept.

### What is yours to change

`perspective` sets how deep the turn looks, in points. Smaller is more dramatic, because the near edge swings further out; below about 400 a full-width card starts to read as a door rather than a card. `rotation="reverse"` sends the turn the other way, which is worth having when two cards side by side should not turn identically.

`useFlipCard()` returns the settled face, the direction, and `progress` — a shared value running 0 to 1 across the turn — so a face can drive its own animation off the same turn rather than starting a second one beside it.

---

Full page, with every example: https://panelui.dev/docs/components/flip-card
