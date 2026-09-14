# Desktop polish task 2: the agent's task list panel

A walkthrough of the change that was implemented. Read it top to bottom and you
will have followed the same path through the codebase.

## What was built

OpenCode's agent maintains its own task list — it writes down what it intends to
do and updates each entry as it goes. That list now appears above the composer:

```
┌─────────────────────────────────────┐
│ ☰ Tasks                        1/4  │
│ ✓ Read the driver                   │
│ ⟳ Add the event                     │
│ ▸ Write the panel                   │
│ ✕ Ship it                           │
└─────────────────────────────────────┘
```

The count is completed/total. Entries past the first 8 are summarized as
"+N more", because a long plan must not push the composer off the bottom.

## The mental model: this is a pipe, not a feature

The single most useful thing to understand here is that **no new provider work
was needed**. OpenCode already publishes this list. It emits an event called
`todo.updated` on the same server-sent event stream the transcript already
reads, carrying the session id and the full list of todos.

So the whole task is plumbing: take a payload the provider already sends, carry
it to the client, draw it. That is true of most provider integrations, and
recognising it is what keeps the change small.

The path has six stations, and knowing them means you can add any
provider-pushed UI yourself:

```
OpenCode server
    ↓  SSE: {"type":"todo.updated","properties":{sessionID,todos}}
driver: crates/waku-core/src/driver/opencode.rs   ← parse it
    ↓  DriverEvent::TodoUpdated(Vec<TodoItem>)
daemon: crates/waku-core/src/daemon.rs            ← serialize for the wire
    ↓  {"kind":"todoUpdated","payload":[...]}
client: src/app/streaming.rs                      ← apply to session state
    ↓  session.todos
UI:     src/app/todo_panel.rs                     ← draw it
```

The event has to cross a process boundary, which is why there are *two* wire
mappings — one in `daemon.rs` (daemon ↔ desktop) and one in
`driver_wire.rs` (browser/mobile clients). Miss one and the code does not
compile, because the `match` is exhaustive. That exhaustiveness is your friend:
the compiler lists exactly what you forgot.

## Step 1 — the data shapes

**File:** `crates/waku-protocol/src/model.rs`

Everything crossing the wire lives in this crate, because both the daemon and
every client depend on it. A `TodoItem` mirrors OpenCode's payload exactly:

```rust
/// One entry in the agent's own task list. Field names follow OpenCode's
/// `todo.updated` payload so its todos deserialize directly.
#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct TodoItem {
    pub content: String,
    pub status: TodoStatus,
    #[serde(default)]
    pub priority: String,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize, TS)]
#[serde(rename_all = "snake_case")]
pub enum TodoStatus {
    #[default]
    Pending,
    InProgress,
    Completed,
    Cancelled,
}
```

Three details worth pausing on, because they are patterns you will reuse:

**`#[serde(rename_all = "snake_case")]`** — the provider spells these
`in_progress`, and the browser and mobile clients decode the same strings, so
the spelling is part of the contract rather than a local choice. `camelCase`
here would have silently broken the other clients.

**`#[default]` on `Pending`** — `TodoStatus` implements `Default`, so an
unrecognized status from a future provider version becomes `Pending` (still
outstanding) instead of failing to parse and losing the task.

**`#[serde(default)]` on `priority`** — the field is optional in practice. A
missing one deserializes to `""` rather than erroring the whole payload.

Then the event variant, next to the existing goal event because they are the
same kind of thing — provider-pushed session state:

```rust
    /// The agent rewrote its own task list. Carries the whole list, and an
    /// empty one clears it, so a late subscriber needs no earlier event.
    TodoUpdated(Vec<TodoItem>),
```

"Carries the whole list" matters. The provider republishes everything on each
change, so the client replaces rather than merges — which also means a client
that connects mid-session gets the current plan from one event.

And the field on the session, so a resumed session shows its plan before the
runtime reconnects:

```rust
    /// The agent's own task list for this session, kept so a resumed session
    /// shows its plan before the runtime reconnects. Empty means the provider
    /// has published no plan, which is also how a completed one is cleared.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub todos: Vec<TodoItem>,
```

`skip_serializing_if` keeps saved state files from growing a `"todos": []` on
every session that never had a plan.

**Do not forget the initializers.** Adding a field to `AgentSession` breaks
every struct literal that builds one. The compiler will point at each; there
were three (`model.rs` twice, `persistence.rs` once).

## Step 2 — parse the provider's event

**File:** `crates/waku-core/src/driver/opencode.rs`

The driver already had a big `match` over event kinds in `handle_event`. Adding
an arm is the whole integration:

```rust
        "todo.updated" => {
            let _ = events.send(DriverEvent::TodoUpdated(todo_items(properties)));
        }
```

The work is in the parser, which is written to be forgiving about the parts
that do not matter and strict about the parts that do:

```rust
fn todo_items(properties: &Value) -> Vec<TodoItem> {
    properties
        .get("todos")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|todo| {
            let content = todo.get("content").and_then(Value::as_str)?.trim();
            if content.is_empty() {
                return None;
            }
            Some(TodoItem {
                content: content.to_owned(),
                status: todo
                    .get("status")
                    .and_then(Value::as_str)
                    .map(todo_status)
                    .unwrap_or_default(),
                priority: todo
                    .get("priority")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .to_owned(),
            })
        })
        .collect()
}
```

Note the shape: `.into_iter().flatten()` on an `Option<&Vec<_>>` is the idiomatic
way to say "iterate this if it exists, nothing if it doesn't" — no `if let`, no
early return. You will see this all over this codebase.

An entry with blank content is dropped, because it would render as an empty row.
An unknown status degrades to `Pending` rather than dropping the task.

The status mapping is a plain function so it is trivial to test:

```rust
fn todo_status(status: &str) -> TodoStatus {
    match status {
        "in_progress" => TodoStatus::InProgress,
        "completed" => TodoStatus::Completed,
        "cancelled" => TodoStatus::Cancelled,
        _ => TodoStatus::Pending,
    }
}
```

## Step 3 — two wire mappings

**Files:** `crates/waku-core/src/daemon.rs`, `crates/waku-protocol/src/driver_wire.rs`

Each needs the same two lines, one outbound and one inbound:

```rust
        DriverEvent::TodoUpdated(todos) => ("todoUpdated", serde_json::to_value(todos)?),
```

```rust
        "todoUpdated" => DriverEvent::TodoUpdated(serde_json::from_value(payload)?),
```

If you add an event and only do one file, `cargo check` fails with
`non-exhaustive patterns: DriverEvent::TodoUpdated(_) not covered` and names the
file. Let the compiler drive.

## Step 4 — apply it to session state

**File:** `src/app/streaming.rs`

```rust
            DriverEvent::TodoUpdated(todos) => {
                // The agent owns this list and republishes all of it, so a
                // change replaces rather than merges. An empty payload clears
                // the panel instead of leaving the last plan on screen.
                if let Some(session) = self.state.session_mut(session_id)
                    && session.todos != todos
                {
                    session.todos = todos;
                    self.state.mark_session_dirty(session_id);
                }
            }
```

Three things this does that are easy to miss:

- **`if let ... && ...`** is a let-chain (Rust 2024). It reads "if there is a
  session and its todos actually changed". Without the comparison, every
  republish would mark the session dirty and cause a pointless save.
- **`mark_session_dirty`** is what persists the change. Forget it and the panel
  works until you restart, then the plan is gone.
- The empty list is deliberately *not* filtered out. It is how a finished plan
  gets cleared.

## Step 5 — draw it

**File:** `src/app/todo_panel.rs` (new)

The panel is a function that takes data and returns an element — no state of its
own, because the session already holds the truth. That keeps it easy to reason
about: same input, same output.

```rust
pub(super) fn render_todo_panel(todos: &[TodoItem], theme: &Theme) -> Option<Stateful<Div>> {
    if todos.is_empty() {
        return None;
    }
    ...
}
```

Returning `Option` is the house pattern for "may not exist": the caller uses
`.children(...)`, which skips `None`. No empty container is built for sessions
with no plan.

The header carries the count, and the entries are capped:

```rust
const TODO_VISIBLE_LIMIT: usize = 8;
```

That cap is a performance decision as much as a layout one. This panel is
rebuilt on every frame the transcript notifies, so the row count has to stay
bounded.

Each row pairs an icon with text, and **the status is never carried by colour
alone** — AGENTS.md treats that as a product requirement, not a preference. Each
state has a distinct glyph:

```rust
    let (glyph, glyph_color) = match todo.status {
        TodoStatus::Completed => ("icons/check.svg", theme.success),
        TodoStatus::InProgress => ("icons/loader-circle.svg", theme.accent),
        TodoStatus::Cancelled => ("icons/x.svg", theme.text_ghost),
        TodoStatus::Pending => ("icons/queue.svg", theme.text_ghost),
    };
```

Colour reinforces the glyph; it never replaces it. That way the row still reads
correctly in a theme where accent and ghost tones sit close together.

### The GPUI type trap

This one will bite you, so it is worth knowing before it does. `.id()` changes
the *type*:

```rust
div()                    // Div
div().id("todo-panel")   // Stateful<Div>
```

So a function returning the second must say so, and the caller needs
`.into_any_element()` to erase it back:

```rust
.map(|panel| panel.into_any_element())
```

If you see `expected Div, found Stateful<Div>`, this is why. The same applies to
`AnyElement` conversions.

### Module imports

A new module under `src/app/` needs three things:

1. `mod todo_panel;` in `src/app.rs`, keeping the alphabetical order.
2. `use crate::model::{TodoItem, TodoStatus};` — sibling modules import model
   types explicitly rather than getting them from `super::*`.
3. `use super::*;` for `Theme`, `tr!`, `px`, `sp`, `icon` and friends.

## Step 6 — the caller

**Files:** `src/app/composer.rs`, `src/app/render.rs`

A thin method reads the selected session and delegates:

```rust
    pub(super) fn render_todo_panel(&self, cx: &mut Context<Self>) -> Option<AnyElement> {
        let todos = &self.selected_session()?.todos;
        super::todo_panel::render_todo_panel(todos, &Theme::current(cx))
            .map(|panel| panel.into_any_element())
    }
```

`?` on `selected_session()` returns `None` early when no task is selected, which
is exactly the desired behaviour.

Then one line in the layout, above the composer:

```rust
                    .when(self.selected_project().is_some(), |element| {
                        element
                            .children(self.render_queued_messages(cx))
                            .children(self.render_todo_panel(cx))
                            .child(self.render_composer(window, cx))
                            .child(self.render_workspace_footer(cx))
                    })
```

## Step 7 — locales

**Files:** `locales/app.yml`, `locales/ja.yml`, `locales/zh-CN.yml`

New user-visible strings go in **all three** catalogs. There is a test that fails
if the key sets diverge, so you find out immediately rather than shipping a
half-translated UI.

```yaml
todo.title:
  en: Tasks
todo.more:
  en: "+%{count} more"
```

## Step 8 — regenerate the TypeScript bindings

```bash
bun run protocol:generate
```

`AgentSession` gained a field and `TodoItem`/`TodoStatus` are new, so the web and
mobile clients need the types. The generated files say "Do not edit this file
manually" and mean it. `bun run protocol:check` verifies they are current, and CI
runs it.

### A mistake to learn from

While editing `model.rs` the `GoalOperation` derive line was accidentally
deleted. The build still succeeded — but the regenerated
`GoalOperation.ts` changed shape:

```
- export type GoalOperation = { "kind": "refresh" } | ...
+ export type GoalOperation = "Refresh" | { "Set": ... } | "Clear";
```

That is a wire-format break for the browser and mobile clients, and no Rust test
caught it. **Always read `git diff` on `packages/waku-client/src/generated/`**
after regenerating: it is the one place where a silent protocol break shows up.
The fix was restoring `#[serde(tag = "kind", rename_all = "camelCase", ...)]`.

## The tests

Four new, all fast and none needing the network.

**`crates/waku-core/src/driver/opencode.rs`** — three tests feeding the real
event shape through `handle_event`:
- the full status ladder maps correctly
- blank entries are skipped and unknown statuses default to `Pending`
- an empty list still reaches the client, because that is how a plan is cleared

**`crates/waku-protocol/src/driver_wire.rs`** — the round trip, pinning the
snake_case spellings the other clients depend on.

**`src/app/todo_panel.rs`** — `todo_progress` counts only completed entries, so a
plan the agent abandoned (cancelled) does not read as finished.

## What to do differently next time

Nothing here was hard. The cost was in the *number of places* one value touches,
and the compiler enforces all of them except the generated bindings. So the loop
is: add the shape, follow the compiler, regenerate, and **diff the generated
folder** before you trust it.
