# T3 Code → Kerenzikov: what is worth taking

**Date:** 2026-10-07
**Scope:** Feature comparison between [T3 Code](https://github.com/pingdotgg/t3code) (pingdotgg's "agent harness control surface") and Kerenzikov (this repo), covering desktop, mobile, and web.
**Purpose:** A reviewable backlog of candidate features. Nothing here is implemented; this is a shortlist to re-check and prioritize later.

> **Relationship to the other comparisons.** `docs/zcode-comparison.md` was
> deleted; T3 Code is now the designated reference for coding-agent workflow in
> `AGENTS.md`, so this doc supersedes it. Where ZCode and T3 Code overlap, T3's
> version is the one to study, because it is open source and its behavior can be
> read rather than inferred from marketing docs.

---

## Method and confidence

- **T3 side:** cloned `pingdotgg/t3code` at `300f7f9d` (2026-10-07, ~163k LOC across `apps/` and `packages/`). Read `docs/user/*` (36 files), `docs/internals/*`, `docs/orchestration-v2/*`, and — unlike the ZCode pass — **verified the load-bearing claims in source**, including `packages/shared/src/keybindings.ts`, `packages/contracts/src/keybindings.ts`, and `apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts`. Claims below say which side they come from.
- **Kerenzikov side:** verified directly in this repository. Every "absent" claim was confirmed by a search that returned no matches, not by assumption. File paths and line numbers are real and were checked at the commit this doc is written on.
- **Not done:** T3 Code was never run. Specifics about timing, animation feel, and real-world reliability are "as documented" and are marked where they matter.

### The framing that matters

These are different species, which shapes what is transferable.

| | T3 Code | Kerenzikov |
|---|---|---|
| Shell | Electron + web + RN mobile | Native Rust / GPUI, plus RN mobile and a web client |
| Scale | ~163k LOC, 26.1k stars, 6.7k forks | Far smaller, single maintainer |
| Architecture | Environment server owns everything; clients are thin | Daemon owns execution; clients are thin |
| Provider model | 6 providers, adapter per provider | 13 providers, driver per transport |
| Platform reach | macOS, Windows, Linux, iOS, Android, web | Windows, Linux, macOS, Android, web |
| Governance | "Mostly not accepting contributions" | Single-owner fork |

**Both bets are the same bet** — a server/daemon owns execution and the clients
control it. That is why so much of T3's UX is transferable: it lands on an
architecture Kerenzikov already has.

**The scale gap is the real story.** T3 has three client surfaces, an Electron
shell, a device panel, and a 163k-LOC codebase with a paid team behind it. Much
of its UX *depth* comes from having run long enough to accumulate detail, not
from an idea Kerenzikov cannot reach. Sort the list by idea, not by polish.

---

## Part 1 — T3 Code feature inventory

### The core idea: typed context

The single most important thing to understand about T3's composer, and the thing
everything else descends from: context is a **data model**, not a string
convention.

- A **context record** is the payload, stored in `message.context.records` and
  keyed by `contextId`. Records never contain bytes; image and file records bind
  to an existing attachment by id.
  (`docs/internals/composer-context-references.md`)
- A **context reference** is one occurrence in the text — a Markdown link
  `[label](t3-context://v1/<kind>/<contextId>)`. Two references can point at one
  record, and **a reference's label is display text and never identity.**
- Records land **at the caret** as chips, not appended to the end: "You can type
  before and after a chip, move it by cutting and pasting, and delete it like a
  character." (`docs/user/composer.md`)
- To the provider, each reference becomes an in-place marker plus one trailing
  envelope, so the agent receives structure rather than prose:
  `[Image: shot.png; ref=ctx_1]` and a `<t3_context version="1">` block.
- Clipboard carries a structured MIME fragment, so a chip pasted into another
  environment re-resolves its payload and shows a dashed *unresolved* chip when
  it cannot.

Inline pickers: `@` for threads, `#` for pull requests, `/` for commands, `$` for
skills.

### Composer

- **Morphing send button.** Shows **Interrupt** while working with an empty
  draft; adding text swaps it to a steer arrow; holding the modifier swaps it to
  a queue icon. One control, three states.
- **Queue vs Steer** is a user setting, with the opposite action on a modifier
  chord; the oldest queued message can be sent as a steer without losing the
  draft.
- **Prompt recall** — arrow-up in an empty composer walks previously sent
  prompts, and only takes over while the text is an unedited recalled prompt.
- **Prompt stash** — a saved draft with attachments, restorable later.
- **Quote an assistant response** into the composer as a citation with an
  optional comment on it.
- **Large paste becomes an attachment.** Pasting ≥32 KiB adds it as a text-file
  attachment instead of flooding context; a modifier chord keeps it inline.
- **Per-question attachments** — each agent question keeps its own attachments
  while you move between questions, separate from the normal draft.
- **Rewind** from a sent message, with a choice of *revert and keep changes* or
  *revert files too*; file restore is refused when another thread shares the
  directory.
- **Two editor modes** (rich/plain) remounted on toggle, with byte-identical
  Markdown round-tripping and clipboard taken from the serializer rather than
  the DOM.

### Sidebar and threads

- Five ordered sections: **Pinned, Active, Working, Snoozed, Settled**, with the
  Working section a collapsed beta.
- **Drag a thread between sections to change its state**, with live drop
  affordances: the dragged row shows the action the drop performs
  (**Pin / Unpin / Settle / Un-settle / Wake**), the rows slide to reveal the
  landing spot, and the target section takes the accent color.
- **Undo for five seconds** on every reversible change — pin, unpin, settle,
  snooze, archive, discard-draft.
- **Server-saved order**, so it survives a refresh and appears on other devices.
- Scroll position preserved on pin, so a row moving does not yank the view.
- Drop files onto any thread row to open it with those files attached.
- Start without a project, in a dated scratch folder; start in the background;
  **shift-click several models** to fan one prompt into separate threads.

### Agent activity and honesty

- Consecutive tool calls collapse into one expandable summary showing commands,
  inputs, status, and exit codes — but not raw output bodies.
- Summaries are counted and deduplicated, and prefer actionable categories over
  reads.
- **The copy refuses to over-claim.** "Waiting on a thread does not mean it
  finished, and an interrupt or cancellation request does not mean the thread
  stopped." Usage likewise: "These estimates are not your subscription bill."

### Visual replies

- Agents can answer with a **self-contained HTML page** — chart, table, diagram,
  collage, mockup — rendered above the written reply, on every surface and every
  provider. Pages follow the app theme, are sandboxed, expandable, viewable as
  source, and saveable. Local images are embedded at publish time so a page
  survives its source files being deleted.
- **MCP Apps**: an interactive app returned by an MCP tool replaces the tool call
  inline, asking permission before acting (Codex only today).

### Handoffs

- Context transfer between threads and machines is a **budgeted selection, not a
  summary**: recent exchanges, the original request, and relevant activity, plus
  **references to omitted history** the agent can retrieve with a thread-reading
  tool. Budget is `T3CODE_CONTEXT_HANDOFF_TOKEN_CAP` (default 16,000).
- If even the references cannot fit, it **errors instead of silently shortening
  your request**. The new request is never shortened to make history fit.

### Other surfaces

- **SnapShot** — captures the window you are in and attaches it to the draft,
  carrying the app name, window title, icon, and the window's accessibility data
  (controls, text, and their positions). Default shortcut is both Shift keys.
  Off by default; pending captures survive closing the app mid-way.
- **Device panel** — a live iOS Simulator or Android Emulator beside the thread,
  interactive, with a tools drawer, a float-over-chat mode, and a 3D fold view.
- **Usage** pooling six providers: tokens, cache savings, model breakdown,
  estimated API-equivalent cost, a limits page pooling accounts per provider, and
  a custom model-price table.
- **Source control** across seven hosts, with files marked as viewed, linked PR
  stacks, and a watch that polls every two minutes and wakes the agent on a
  failed check.
- **Keybindings as data** — see Part 3, item 4.
- **Settings provenance** — a layers icon showing whether a value comes from the
  built-in default, the environment, or a project override, amber on
  disagreement, `Mixed` for differing values.
- Browser cookie import, on-device voice input (iOS), and server-owned terminal
  scrollback capped at 5,000 lines / 8 MiB.

---

## Part 2 — Kerenzikov current state (verified in source)

Already present, and a precondition for the items below:

- Daemon + thin clients, with desktop (`src/`), mobile (`apps/mobile/`), and web
  (`apps/web/`) sharing one protocol.
- Rich transcript: streaming markdown with veil and mending (`src/md/`), inline
  diffs, reasoning disclosure, per-turn navigation rail, in-transcript search.
- Composer: model/effort pickers, access modes, presets, goals, attachments,
  drafts, `@`-file and slash autocomplete.
- Right panel with tabs: Browser, Terminal, Files, Review, file editor. Each
  surface can be opened more than once (a new terminal is a new tab), but there
  is **no split-pane model** — terminal tabs are siblings, not panes.
- **A todo tray and panel** (`src/app/todo_panel.rs`), fixed for Claude Code and
  Oh My Pi in #50 and #51.
- Background work and subagent monitoring (`src/app/background_work.rs`).
- Skills page, project memory with secret screening, usage page, computer use,
  Windows tray, i18n in three locales.
- **Undo toasts already exist** (`ToastUndo`, `show_undo_toast` at
  `src/app.rs:1920`), wired to archiving at `src/app/sessions.rs:436` — this was
  on the candidate list and is not a gap.

---

## Part 3 — Gap analysis

### Tier 1 — high value, fits the existing architecture

#### 1. Typed context chips

**Gap:** no typed-reference model exists. Searches for `ContextRecord` and
`t3-context` return nothing. Kerenzikov has `@`-file autocomplete and attachment
chips, both string conventions.

**Take:** the record/reference split, caret-anchored chips, and the provider
projection envelope. Copy the rule that a reference's label is display text and
never identity.

**Why first:** chips, citations, SnapShot, and handoffs are four features that
all reduce to "attach a typed payload by id." Built separately, that is the same
machinery written four times.

**Effort:** large — it is a data-model change, not a widget.

#### 2. SnapShot: capture a window into the draft

**Gap:** `crates/waku-core/src/computer_use.rs` lets the agent *view* the screen,
and `src/app/composer.rs:700` renders such a screenshot, but there is no
capture-a-window-into-my-draft path. Screenshots are display-only.

**Take:** a global shortcut, capture of the active window **plus its
accessibility tree**, attach to the draft, and survive closing the app mid-way.
The accessibility data is the part that makes it useful rather than a picture.

**Effort:** medium — capture plus a permission flow per platform.

#### 3. Morphing send button

**Gap:** Stop and send are separate controls, with queue/steer chosen by
modifier.

**Take:** one control that reads **Interrupt → steer → queue** from draft state
and modifier, so the button shows what will happen.

**Effort:** small — one control and its state mapping.

#### 4. Keybindings as data with a `when` grammar

**Gap:** bindings are hardcoded in thirteen `cx.bind_keys([...])` call sites
across `src/` (app-level at `src/lib.rs:233`, text fields in `src/input.rs`, and
one per dialog or page), with no override mechanism.

**Take:** a JSON file of `{key, command, when}`; an expression grammar with `!`,
`&&`, `||`, and parentheses; and last-matching-rule-wins precedence. T3 parses
this properly (`parseKeybindingWhenExpression`, `MAX_WHEN_EXPRESSION_DEPTH`) and
registers **50 commands** (`packages/contracts/src/keybindings.ts`), with context
keys including `composerFocus`, `terminalFocus`, and `isDesktop`.

**Prerequisite:** a stable command registry, which does not exist yet. The
binding layer is the easy half; naming and owning 50 commands is the other half.

**Effort:** medium — mechanical across ten sites, but the registry is design work.

#### 5. Sidebar sections with drag-between-sections

**Gap:** only `SidebarGrouping::Project | Updated`
(`crates/waku-client/src/persistence.rs:41`). There is no pin, no snooze, and no
settled shelf; long histories only grow.

**Take:** the section set, drag-to-change-state with live drop affordances, and
per-state iconography. Pair it with the existing undo-toast machinery rather
than inventing a second one.

**Effort:** medium — self-contained UI, but it needs a per-thread state field and
its persistence.

### Tier 2 — worth doing

| Feature | Gap in Kerenzikov | Notes |
|---|---|---|
| **Visual replies (HTML)** | Absent | Agent writes a self-contained page rendered above the reply, theme-aware and sandboxed. Distinctive and provider-agnostic. Needs a sandboxed renderer, which GPUI does not give for free. |
| **Handoff as budgeted selection** | Absent | The idea transfers without T3's machinery: transfer recent plus original plus *references to omitted history*, cap it, and error rather than silently shorten. Kerenzikov already forks and switches models. |
| **Per-question attachments** | Absent | Each agent question keeps its own attachments, separate from the draft. Small, and the attachment path already exists. |
| **Large-paste → attachment** | Absent | Paste past a threshold becomes a text-file attachment instead of flooding context. Cheap, and pairs with the existing attachment chips. |
| **Settings provenance** | Only a provider binary override (`src/app/settings.rs:2160`) | The layers-icon pattern: default → environment → project override, amber on disagreement, `Mixed`, `Reset all`. Becomes more valuable as per-project settings grow. |
| **Honest-uncertainty copy** | No convention either way | Zero code. Adopt the rule that a status line never claims more than is known. |

### Tier 3 — bigger lifts, situational

- **Device panel** — live simulator beside the thread, interactive, with a 3D
  fold view. Needs Xcode and Android SDK plumbing, and a payoff mostly for
  mobile-app work.
- **Watch a pull request** — the server polls every two minutes and wakes the
  agent on a failed check. Fits the daemon; needs a host integration.
- **Browser cookie import** — reuse signed-in sessions in the preview browser.
- **MCP Apps** — inline interactive app replacing a tool call. Heavy, and one
  provider supports it today.

---

## Part 4 — Where Kerenzikov is already at parity or ahead

- **The todo panel does not exist in T3.** T3 parses `todos` in its provider
  adapters (`apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:2954`)
  and renders nothing: there is no todo UI component in `apps/web` or
  `apps/mobile`, and no document describing one. Kerenzikov's tray and panel,
  including the phased Oh My Pi shape, are ahead of the repo people call the
  best available.
- **Native shell.** GPUI rather than Electron, which is the stated reason the
  transcript stays smooth under a long session.
- **Provider breadth** — 13 providers across seven transports
  (`docs/providers.md`), against T3's six providers.
- **Undo toasts** already exist, and predate this comparison.
- Rich transcript behavior generally: streaming veil, marker mending, per-turn
  navigation, inline diffs.

---

## Part 5 — What not to copy

- **Electron.** T3's client is a web app in a shell; Kerenzikov's native shell is
  the point.
- **Orchestration V2.** `docs/orchestration-v2/` is explicitly a target
  architecture that "intentionally ignores migration and backward
  compatibility." It is a design document, not shipped behavior.
- **MCP Apps inline rendering** — disproportionate cost for one provider.
- **The 163k-LOC shape.** T3's breadth is a consequence of team size and time;
  matching it is not a goal.
- **Scale-driven complexity**: six packages, five apps, a contracts layer. Adopt
  the ideas, not the topology.

---

## Part 6 — Suggested order

1. **Typed context chips** — the architectural idea; three later items depend on
   it.
2. **Large-paste → attachment** and **honest-uncertainty copy** — tiny, immediate,
   no prerequisites.
3. **Morphing send button** — small, self-contained, visible every turn.
4. **Per-question attachments** — small, reuses the attachment path.
5. **SnapShot** — medium, and the highest-value new *input* path available.
6. **Sidebar sections** — medium, self-contained, reuses the existing undo toast.
7. **Keybindings as data** — medium; scope the command registry before promising.
8. **Visual replies**, **handoff**, **settings provenance** — evaluate after the
   above.

## Re-check checklist

- [ ] Confirm the T3 commit (`300f7f9d`) is still representative; the repo moves
      fast and the docs are maintained alongside the code.
- [ ] Re-verify the **todo-panel absence** in T3 before relying on it as a
      differentiator — it is a young repo and this is a plausible near-term
      addition.
- [ ] Confirm the **50-command count** in `packages/contracts/src/keybindings.ts`
      at the time the keybinding work is scoped.
- [ ] Read `src/app/composer.rs` before scoping the morphing send button; the
      queue/steer paths may already be closer to one control than they look.
- [ ] Decide whether typed context chips port to the Rust protocol as a new wire
      type or stay client-side. This determines whether mobile and web get chips
      in the same change or later.
- [ ] Re-check `ToastUndo` (`src/app.rs:1920`) before building sidebar undo — the
      machinery exists and should be extended, not duplicated.
