# The task-list tray

The agent's task list drawn above the composer, so the plan is visible without
asking for it. The meter in the workspace footer opens the same list as a
popover; the tray is the standing form.

Shipped alongside two other changes worth reading first:
[agent-task-list-panel.md](agent-task-list-panel.md) walks the data path, and
[providers.md](providers.md#the-agents-task-list) lists which provider publishes
what.

## Shipped

| Change | Where |
| --- | --- |
| Classifier accepts Claude Code's `Task*` tools, including `mcp__`-namespaced spellings | `crates/waku-protocol/src/model.rs`, `ActivityKind::tool_leaf_name` |
| Task list rebuilt across single-task tool calls | `crates/waku-core/src/driver/activity.rs`, `TodoAccumulator` |
| Claude driver dispatches `TodoWrite` vs `TaskCreate`/`TaskUpdate` | `crates/waku-core/src/driver/claude.rs` |
| Windowed tray rendered above the composer | `src/app/todo_panel.rs`, `render_todo_tray` |
| Per-session fold state | `src/app.rs`, `todo_tray_collapsed` |
| Tray mounted between the queue tray and the composer | `src/app/render.rs` |

## The shape

```
                 … transcript …
   ┌───────────────────────────────────┐
   │ ⌄ Tasks                      1/4  │   ← header, click to fold
   │ ▸ 2 earlier                       │   ← only when the plan is long
   │ ✓ Read the driver                 │
   │ ⟳ Add the event                   │   ← current step, brightest
   │ ○ Write the panel                 │
   │ ▸ 1 later                         │   ← only when the plan is long
   └───────────────────────────────────┘
   ┌───────────────────────────────────┐
   │  composer                         │
   └───────────────────────────────────┘
```

## The window

`visible_todo_window` is the whole layout decision, and it is a pure function so
it can be tested without a window.

- **Six or fewer entries** — show all of them, hide nothing.
- **More than six, one in progress** — show six centered on the in-progress
  entry: `TODO_TRAY_LEAD` before it, the remainder after. Never run past the end
  of the plan; a current step near the tail shifts the window back instead of
  shortening it.
- **More than six, nothing in progress** — show the last six. A finished or
  stalled plan's outcome is at its end, not its start.
- Edge rows read `N earlier` / `N later`, and only appear when something is
  actually hidden on that side.

The tray deliberately does **not** scroll. A plan that outgrows the window is
summarized, because a taller tray would push the composer down on every frame.

## Folding

The header is a button. Clicking it collapses the tray to its header line alone,
per session: a plan is interesting while it runs and noise afterwards, and that
differs per task. State lives in `Waku::todo_tray_collapsed` and is toggled by
`Waku::toggle_todo_tray`.

The footer meter is unchanged and stays as the collapsed affordance, so folding
the tray never removes the only way to reach the list.

## What the rows say

Each row is a status glyph plus text, and the status is **never** carried by
colour alone — the glyph distinguishes the four states and the colour reinforces
it. This is a product requirement in `AGENTS.md`, not a preference: a theme whose
accent and ghost tones sit close together must still read correctly.

| Status | Glyph | Text |
| --- | --- | --- |
| Completed | check | recedes |
| In progress | spinner | brightest |
| Pending | empty ring | secondary |
| Cancelled | cross | recedes |

## Provider coverage

The tray renders whatever `session.todos` holds, so it appears for every
transport that publishes a plan — see the table in
[providers.md](providers.md#the-agents-task-list). Two cases where it stays
empty, and neither is a defect:

- **OpenCode 2** publishes no task-list event on the adopted service stream.
- **Claude Code on a current model** may not create tasks at all. The CLI's
  `Task*` tools are default only on older models; on newer ones Claude tracks
  multi-step work without a written list. Waku does not set
  `CLAUDE_CODE_ENABLE_TODO_TOOLS`, so the list appears only when the provider
  chooses to publish one.

## Still open

- Nothing here is knowingly unfinished. If the tray needs a scroll container for
  a plan that a user wants in full, that is a new decision rather than a gap in
  this one.
