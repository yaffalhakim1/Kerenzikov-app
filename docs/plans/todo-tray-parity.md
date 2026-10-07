# Plan: the todo tray, provider parity, and PARITY.md

Branch: `todo-tray-parity`

Three deliverables:

1. **Fix the todo provider gap** — the reported bug.
2. **Promote the todo panel to a tray above the composer** — the Zeron steal.
3. **Add `PARITY.md`** — the Zeron steal, cheap, do first.

---

## 1. The bug: root cause (verified, not guessed)

The premise "only OpenCode shows todos" was checked against the tree and is
**not** caused by a provider gate. There is no `ProviderKind` check anywhere in
`todo_panel.rs`, `composer.rs`, `render.rs`, `streaming.rs`, or either wire
mapping. All eight transports emit `DriverEvent::TodoUpdated`.

The real cause is **Claude Code feature drift**. Per
<https://code.claude.com/docs/en/agent-sdk/todo-tracking>:

- Claude Code v2.1.268+ replaced `TodoWrite` with four tools: `TaskCreate`,
  `TaskUpdate`, `TaskList`, `TaskGet`. `TodoWrite` survives only when
  `CLAUDE_CODE_ENABLE_TASKS=0`.
- The new `Task*` tools are **default only on older models** (Claude 3.x, Opus
  4–4.7, Sonnet 4–4.6, Haiku 4.5). On newer models they do not exist unless the
  session opts in.
- `TaskCreate` does **not** carry the whole list. It carries one `subject` and
  creates one task; the assigned id comes back on the paired `tool_result` as
  `tool_use_result.task.id`. `TaskUpdate` carries one `taskId` plus a partial
  patch. A renderer must maintain state across calls.

Kerenzikov handles neither shape. Verified gaps:

| Gap | Location | Effect |
| --- | --- | --- |
| `TaskCreate`/`TaskUpdate`/`TaskList`/`TaskGet` are not in the `Plan` classifier | `crates/waku-protocol/src/model.rs:1962` | They classify as `ActivityKind::Tool`, so the `kind == Plan` gate never fires |
| MCP-namespaced variants (`mcp__tools__task_create`) leave `taskcreate` after leaf-stripping | same | Never matches even after the name is added naively |
| `plan_input_todos` only reads `todos`/`plan` | `crates/waku-core/src/driver/activity.rs:125` | `TaskCreate`'s `subject` is invisible |
| No accumulator for single-task tool calls | `crates/waku-core/src/driver/claude.rs:1490` | Three Task calls would produce three one-item lists, each replacing the last |

Reproduced by simulating the classifier against the real tool names:

```
Tool   TaskCreate      Tool   mcp__tools__task_create
Tool   TaskUpdate      Tool   mcp__tools__task_update
Plan   TodoWrite       Plan   update_plan
Tool   write_todos     Tool   manage_todo_list
```

Secondary gap: `write_todos`, `WriteTodos`, and `manage_todo_list` are plausible
tool names used by other harnesses and MCP servers, and none classify as `Plan`.

**Not a bug:** OpenCode 2 publishes no task-list event on the adopted service
stream (`docs/providers.md:84`). That panel is correctly empty.

---

## 2. Fix design

### 2a. Widen the classifier (the actual bug)

`crates/waku-protocol/src/model.rs` — extend the `Plan` arm in
`from_tool_name` and add a `Plan` sub-shape. Deliberately **not** adding
`task*` wholesale: `Task` is also Claude Code's *subagent* tool, and
`TaskOutput`/`TaskStop` are subagent bookkeeping, not plans.

```
"todo" | "todowrite" | "updateplan" | "plan"
| "writetodos" | "managetodolist" | "tasklist"
| "taskcreate" | "taskupdate" | "taskget"
```

`taskoutput` and `taskstop` stay out. `task` (the subagent tool) stays out.

### 2b. An accumulator for incremental task tools

New, per driver session, in `crates/waku-core/src/driver/activity.rs`:

```rust
pub(super) struct TodoAccumulator {
    /// taskId -> entry. Ordered by first-seen so the list reads as written.
    tasks: IndexMap<String, TodoItem>,
}

impl TodoAccumulator {
    /// A whole-list payload (`TodoWrite`, ACP `plan`, Codex) resets and replaces.
    pub(super) fn replace(&mut self, todos: Vec<TodoItem>) -> Vec<TodoItem>;

    /// `TaskCreate`: stage under the tool-call id until the result names it.
    pub(super) fn stage_create(&mut self, tool_call_id: &str, subject: &str, active_form: Option<&str>);

    /// The paired `tool_result` names the created task; promote it.
    pub(super) fn resolve_create(&mut self, tool_call_id: &str, task_id: &str) -> Vec<TodoItem>;

    /// `TaskUpdate`: patch one task; `status: "deleted"` removes it.
    pub(super) fn apply_update(&mut self, input: &Value) -> Vec<TodoItem>;

    pub(super) fn snapshot(&self) -> Vec<TodoItem>;
}
```

Rules, taken from the docs rather than invented:

- Read `taskId` as `taskId ?? id ?? task_id` and `activeForm` as
  `activeForm ?? active_form` — Claude Code repairs these before execution but
  **the repair is not reflected in the stream**, so the stream must be read
  defensively.
- `status: "deleted"` removes the entry. Unknown status degrades to `Pending`
  via the existing `todo_status`.
- An in-progress item renders `activeForm` when present, else `subject`.
  `TodoItem.content` already holds the display string, so no new field.
- The accumulator is driver-local state, so it never touches the wire.

### 2c. Wire the accumulator where it is needed

Only `claude.rs` needs it (Claude Code is the only transport that went to
incremental task tools; Amp shares the old wire format, Pi/DeepSeek/ACP/Codex
all publish whole lists). Keeping it in `claude.rs` rather than every driver
avoids dead state.

- On `tool_use` with a plan name: if the input carries `todos`/`plan`, use the
  existing `plan_input_todos` path unchanged; otherwise dispatch to
  `stage_create` / `apply_update`.
- On `tool_result`: `resolve_create` using `tool_use_result.task.id`.
- Every mutation emits `DriverEvent::TodoUpdated(accumulator.snapshot())`.

### 2d. Claude Code tool availability (defensive, optional)

Kerenzikov does not pass `--allowedTools`, `--tools`, or
`CLAUDE_CODE_ENABLE_TODO_TOOLS`. On a newer model the `Task*` tools may be
absent entirely, in which case there is genuinely nothing to show. Adding
`CLAUDE_CODE_ENABLE_TODO_TOOLS=1` to the child env would make the list appear on
every model.

**Decision: do NOT set it in this change.** It changes provider behaviour for
every user to fix a display, and the doc's own framing is that newer models
"track multi-step work without a written todo list". Filed as a note in the doc
instead. Revisit if the classifier fix alone leaves real sessions without todos.

---

## 3. The tray (Zeron steal)

Today the panel is a **popover** off a 20px icon chip in the workspace footer
(`src/app/todo_panel.rs:47`, mounted `composer.rs:3500`). Zeron mounts it as a
**tray above the composer**, because the point is not to have to ask.

### Target shape

```
                 … transcript …
   ┌───────────────────────────────────┐
   │ ▸ 2 earlier                       │   ← only when > 6 items
   │ ⟳ Add the event                   │   ← current item, brightest
   │ ○ Write the panel                 │
   │ ○ Ship it                         │
   │ ▸ 1 later                         │   ← only when > 6 items
   │                      Tasks · 1/4  │   ← header/count row
   └───────────────────────────────────┘
   ┌───────────────────────────────────┐
   │  composer                         │
   └───────────────────────────────────┘
```

### Behaviour to implement

| Aspect | Rule |
| --- | --- |
| Mount | `render.rs:373` — between the queued-message tray and the composer |
| Width ladder | tray is one inset step narrower than the composer card, matching the queued tray |
| Items ≤ 6 | show all of them |
| Items > 6 | window of 3 centred on the current item; `N earlier` / `N later` edge rows |
| Finished list | show the **last** three, header reads `Tasks · 5/5 · All done` |
| No todo | render nothing (`Option` + `.children()`, the existing house pattern) |
| Running but idle | a **still ring** for the in-progress glyph, so an interrupted turn does not look busy |
| Status | glyph **and** colour; never colour alone (existing AGENTS.md rule, already honoured) |
| Collapse | a disclosure control hides the tray to a one-line `Tasks · 1/4` row; state is per-session and persisted with UI settings |

### Keep the footer chip?

Keep it as the collapsed trigger. Removing it would lose the only affordance for
a session whose tray the user collapsed, and it costs nothing — it already
exists and already reads `{completed}/{total}`.

### Reuse, don't rewrite

`todo_progress` (`todo_panel.rs:35`) and `todo_row` (`todo_panel.rs:144`) are
already correct and stay. The work is:

- extract the row list + windowing into a pure fn so it is unit-testable
  without GPUI: `visible_todo_window(todos, limit) -> TodoWindow`
- add `render_todo_tray` alongside `render_todo_meter`, sharing both helpers
- add the collapsed-state read/write next to the other per-session UI prefs

`TODO_VISIBLE_LIMIT` (8) becomes the popover's cap and the tray's windowing is
separate (6 total / 3 window), so the two surfaces can differ without one
constraining the other.

---

## 4. PARITY.md

Repo-root `PARITY.md`, Zeron-style: a table per area with
**done / partial / deferred** and named gaps inline. Content is derived from
what already exists, not aspirational:

- desktop shell, transcript, composer, right panel, sidebar/sessions
- agent orchestration (subagents, background work, todo tray, goals)
- providers (per-transport, with the `docs/providers.md` table linked)
- daemon + clients (desktop / web / mobile)
- update / release / i18n

Each row: `| Item | Status | Notes |`. Status is one of the three words.
A `## Deferred` section at the end names deliberate omissions with the reason.

---

## 5. Files touched

| File | Change |
| --- | --- |
| `PARITY.md` | new |
| `crates/waku-protocol/src/model.rs` | widen `Plan` arm; tests |
| `crates/waku-core/src/driver/activity.rs` | `TodoAccumulator` + tests |
| `crates/waku-core/src/driver/claude.rs` | dispatch to the accumulator; tests with the real `Task*` stream shape |
| `crates/waku-core/src/driver/support.rs` | classifier tests for the new names |
| `src/app/todo_panel.rs` | `visible_todo_window`, `render_todo_tray`; tests |
| `src/app/composer.rs` | tray mount is in `render.rs`, but the collapsed state lives with the other composer prefs |
| `src/app/render.rs` | mount the tray above the composer |
| `locales/app.yml`, `ja.yml`, `zh-CN.yml` | `todo.all_done`, `todo.earlier`, `todo.later`, `todo.collapse`, `todo.expand` |
| `docs/agent-task-list-panel.md` | correct the "OpenCode was first" framing; document the Task-tool shape |
| `docs/providers.md` | update the Claude row: `TodoWrite` **and** `Task*` |
| `docs/todo-tray.md` | new, matching `docs/sidebar-compact-rows.md` structure |

## 6. Tests

- `activity.rs`: accumulator — create→resolve→update→delete, out-of-order
  update for an unknown id, `active_form` handling, deleted removes.
- `claude.rs`: a recorded stream with `TaskCreate` + paired `tool_result` +
  `TaskUpdate`, asserting the accumulated list; plus the existing `TodoWrite`
  test still passing unchanged.
- `support.rs`: `TaskCreate`/`TaskUpdate`/`TaskList`/`mcp__tools__task_create`
  classify as `Plan`; `TaskOutput`/`TaskStop`/`Task` do not.
- `todo_panel.rs`: `visible_todo_window` — under limit, over limit centred on
  current, finished shows last three, no in-progress item, empty list.
- Cross-module: an app-level test in `src/app/tests.rs` that a session with
  todos renders the tray gate as `Some`, and one without renders `None`.

## 7. Verification

1. `cargo test -p waku-protocol -p waku-core` — classifier + accumulator.
2. `cargo test -p waku` (the app crate) — windowing + gate.
3. `bun run protocol:check` — no wire change expected, but the check runs in CI
   and the `TodoItem` shape is untouched.
4. `bun run i18n`-equivalent / the locale key-set test in three catalogs.
5. Run the app against a real Claude Code session on a current model and watch
   the tray appear and advance. This is the only test that proves the bug is
   fixed, and the AGENTS.md rule requires it (validate in the running app, not
   just a green build).
6. Load a session saved *before* this change and confirm no field is missing.

## 8. Ordering

```
PARITY.md            (independent, do first — no code risk)
  ↓
classifier + accumulator + claude wiring   (the bug fix; ship-able alone)
  ↓
window fn + tray + locales + docs          (the UI change)
```

The fix lands before the tray so that if the tray slips, parity is already
correct.

## 9. Risks

| Risk | Mitigation |
| --- | --- |
| Claude Code changes the Task tool shape again | The accumulator reads defensively (`taskId ?? id ?? task_id`) and degrades unknown statuses; the shape is pinned by a recorded-stream test |
| Widening the classifier steals `Task` from the subagent path | `Task`, `TaskOutput`, `TaskStop` explicitly excluded, with a test |
| The tray costs transcript height on every frame | Rows are capped at 6; it renders nothing when there is no plan, which is the common case |
| Collapsed state needs persistence | Follow the existing per-session UI-pref pattern rather than inventing one |
| Locale key-set test fails CI | All three catalogs updated in the same commit |
