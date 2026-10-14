# Recipes

Whole screens, composed out of the parts. Each one is the shape to reach for before writing a
`View` and styling it by hand — a "custom" settings screen, chat transcript or filter sheet is
almost always one of these.

Read the component's own reference in `components/` for the props; these show the *composition*.

## A settings screen

`Frame` is the tray, `Frame.Panel` the card inside it, `Frame.Row` a row. A row with `onPress`
announces itself as a button; without one it is a plain view.

```tsx
import { Frame, Switch, Chip, ChevronRightIcon } from 'panelui-native';

<Frame>
  <Frame.Header>
    <Frame.Title>Notifications</Frame.Title>
    <Frame.Action>Three of five on</Frame.Action>
  </Frame.Header>
  <Frame.Panel>
    <Frame.Row>
      <Frame.Content>
        <Frame.Title>Push</Frame.Title>
        <Frame.Description>Mentions and direct messages</Frame.Description>
      </Frame.Content>
      <Frame.Actions>
        <Switch value={push} onValueChange={setPush} haptics />
      </Frame.Actions>
    </Frame.Row>
    <Frame.Row onPress={() => router.push('/settings/email')}>
      <Frame.Content>
        <Frame.Title>Email</Frame.Title>
        <Frame.Description>Weekly digest</Frame.Description>
      </Frame.Content>
      <Frame.Actions>
        <Chip size="sm">Weekly</Chip>
        <ChevronRightIcon size={16} />
      </Frame.Actions>
    </Frame.Row>
  </Frame.Panel>
</Frame>
```

## A form with validation

`createForm` holds the values, the errors and the submission. Each field is a render prop, so the
control stays whichever control it was — nothing is wrapped or replaced.

```tsx
import { createForm, Input, Switch, Field, Button } from 'panelui-native';

type SignUpValues = { email: string; acceptedTerms: boolean };

const SignUpForm = createForm<SignUpValues>();

function SignUp() {
  const form = SignUpForm.useForm({
    defaultValues: { email: '', acceptedTerms: false },
    onSubmit: async (values) => register(values),
  });

  return (
    <SignUpForm form={form}>
      <SignUpForm.Field
        name="email"
        validate={(value) => (value.includes('@') ? undefined : 'Enter a valid email')}
      >
        {(field) => (
          <Input
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            errorMessage={field.error}
            avoidKeyboard
          />
        )}
      </SignUpForm.Field>

      <SignUpForm.Field name="acceptedTerms">
        {(field) => (
          <Field orientation="horizontal">
            <Field.Content>
              <Field.Title>Accept the terms</Field.Title>
              <Field.Description>You can withdraw this later.</Field.Description>
            </Field.Content>
            <Switch value={field.value} onValueChange={field.onChange} />
          </Field>
        )}
      </SignUpForm.Field>

      <Button onPress={form.handleSubmit} loading={form.submitting}>
        Create account
      </Button>
    </SignUpForm>
  );
}
```

A field is `Field` + a title + the control — not a `View` with a `Text` above it. That is what
gets the label associated with the control for a screen reader.

## A chat transcript

`MessageScroller` is virtualized and owns the stick-to-bottom behaviour; `Message` is one turn.
`AIInput` is the composer, and it docks to the keyboard on its own.

```tsx
import { MessageScroller, Message, Avatar, AIInput } from 'panelui-native';

<View className="flex-1">
  <MessageScroller autoScroll className="flex-1">
    <MessageScroller.List
      data={messages}
      renderItem={({ item }) => (
        <Message align={item.role === 'user' ? 'end' : 'start'}>
          {item.role === 'assistant' ? (
            <Message.Avatar>
              <Avatar size="sm" fallback="AI" />
            </Message.Avatar>
          ) : null}
          <Message.Content>
            <Message.Bubble>
              <Message.BubbleContent>{item.body}</Message.BubbleContent>
            </Message.Bubble>
          </Message.Content>
        </Message>
      )}
    />
    <MessageScroller.Button />
  </MessageScroller>

  <AIInput value={draft} onChangeText={setDraft} onSubmit={send} />
</View>
```

For streamed assistant output use `Response` (markdown as native components), `Reasoning` for the
thinking, `Sources` for citations and `Shimmer` while the first token is still in flight.

## Filters in a bottom sheet

The sheet takes `open`/`onOpenChange`, or runs uncontrolled from its trigger. **Do not
conditionally render an overlay to close it** — it has an exit animation to finish.

```tsx
import { BottomSheet, Button, ToggleButtonGroup, ToggleButton, Slider } from 'panelui-native';

<BottomSheet>
  <BottomSheet.Trigger>
    <Button variant="outline">Filters</Button>
  </BottomSheet.Trigger>
  <BottomSheet.Content>
    <BottomSheet.Header>Filters</BottomSheet.Header>
    <BottomSheet.Body className="gap-5">
      <ToggleButtonGroup value={sort} onValueChange={setSort}>
        <ToggleButton value="new">Newest</ToggleButton>
        <ToggleButton value="price">Price</ToggleButton>
        <ToggleButton value="rating">Rating</ToggleButton>
      </ToggleButtonGroup>
      <Slider value={maxPrice} onValueChange={setMaxPrice} min={0} max={500} step={10} />
    </BottomSheet.Body>
    <BottomSheet.Footer>
      <Button onPress={apply}>Show results</Button>
    </BottomSheet.Footer>
  </BottomSheet.Content>
</BottomSheet>
```

## A list with actions behind each row

`Swipe` wraps the row. For a whole list's worth of actions at once, `SelectionMode` is the other
answer.

```tsx
import { Swipe, Item, TrashIcon, ArchiveIcon } from 'panelui-native';

{files.map((file) => (
  <Swipe key={file.id}>
    <Swipe.End>
      <Swipe.Action icon={<ArchiveIcon />} label="Archive" onPress={() => archive(file.id)} />
      <Swipe.Action
        icon={<TrashIcon />}
        label="Delete"
        color="destructive"
        onPress={() => remove(file.id)}
      />
    </Swipe.End>
    <Item variant="outline" onPress={() => open(file)}>
      <Item.Content>
        <Item.Title>{file.name}</Item.Title>
        <Item.Description>{file.size}</Item.Description>
      </Item.Content>
    </Item>
  </Swipe>
))}
```

## A chart in a card

Every chart is composed the same way: the grid, each series, the axes and the readout are separate
children, so a chart that wants no grid simply does not have one. The card around it is `Frame`.

```tsx
import { Frame, BarChart } from 'panelui-native';

<Frame className="w-full">
  <Frame.Header>
    <Frame.Title>Revenue</Frame.Title>
    <Frame.Action>Last 8 months</Frame.Action>
  </Frame.Header>
  <Frame.Panel>
    <BarChart data={revenue} xDataKey="month" aspectRatio={2}>
      <BarChart.Header value="$284k" caption="8 months" legend />
      <BarChart.Grid />
      <BarChart.Bar dataKey="revenue" />
      <BarChart.Bar dataKey="costs" colorIndex={2} />
      <BarChart.XAxis />
      <BarChart.Tooltip />
    </BarChart>
  </Frame.Panel>
</Frame>
```

The header's value is passed in rather than derived, so one header can show a total when nothing
is pressed and a band's value when something is — take it from `onActiveIndexChange`.

## A search with results

The field lifts clear of the keyboard while it is focused and the results open upward out of it,
into the space that is actually free.

```tsx
import { SearchBar } from 'panelui-native';

<SearchBar
  avoidKeyboard
  cancel="focus"
  placeholder="Search or enter company"
  debounce={400}
  loading={pending}
  value={query}
  onChangeText={setQuery}
  onDebouncedChange={search}
>
  {results.length ? (
    <SearchBar.Section label="Results">
      {results.map((item) => (
        <SearchBar.Item key={item.id} onPress={() => pick(item)}>
          {item.name}
        </SearchBar.Item>
      ))}
    </SearchBar.Section>
  ) : (
    <SearchBar.Status loading={pending}>
      {pending ? 'Searching …' : 'No matches'}
    </SearchBar.Status>
  )}
</SearchBar>
```

## A transient message

`useToast` needs `PanelUIProvider` above it — the viewport is one of the four things the provider
owns.

```tsx
import { useToast } from 'panelui-native';

const { toast } = useToast();

toast.show('Link copied');

toast.show({
  variant: 'success',
  label: 'Deployment complete',
  description: 'panelui.dev is live on production.',
  actionLabel: 'View',
  onActionPress: ({ hide }) => hide(),
});
```

## Switching theme at runtime

Six themes in three families — Panel, Moon, Grass — each in light and dark. A family sets its own
radius scale as well as its palette, so switching one changes the shape of the UI too.

```tsx
import { useThemeMode, PANEL_EXTRA_THEMES } from 'panelui-native';

const { theme, setTheme, mode, setMode } = useThemeMode();
```

A named theme has to be listed in `extraThemes` in `metro.config.js` and the dev server restarted,
or `setTheme` throws that the theme was not registered. `PANEL_EXTRA_THEMES` is exactly that list.
