# Parity

What exists, what is half-built, and what was deliberately left out. One row per
item, status is exactly one of **done**, **partial**, or **deferred**, and every
gap is named in the row rather than left to be discovered.

"Done" means implemented and covered by tests. It does not mean finished
forever. This file is audited against the tree, not against intentions, so a row
that drifts out of date is a bug in this file.

Version at last audit: `0.1.51`.

---

## Desktop shell

| Item | Status | Notes |
| --- | --- | --- |
| Window chrome and controls | done | Custom chrome, `src/app/window_chrome.rs`. |
| Three-pane layout | done | Sidebar, transcript, tabbed right panel (`src/app/render.rs`). Panels animate and drag-resize. |
| Panel visibility | done | Sidebar and right panel toggle independently; widths and minima in `src/app.rs`. |
| Right-panel surfaces | done | Browser, Terminal, Files, Review, per-file editor, background work. |
| Split panes | deferred | The transcript cannot be split, and panes cannot nest. The pane renderer exists; the missing piece is a split tree above it. |
| Task switcher | done | Ctrl-Tab overlay with a card grid. |
| FPS counter | done | Toggle in the View menu. |
| Themes | done | System / Light / Dark, plus themed palettes in `src/theme.rs`. |
| Command palette | done | Tasks, commands, settings, terminal sessions, providers. |
| Native menu bar | done | `src/lib.rs`. |
| Keyboard shortcuts | partial | Global bindings are fixed in code. There is no user rebinding UI. |
| Tray (Windows) | done | Show / Quit. |
| System notifications | done | Task completion and park, click opens the task. |
| Onboarding | partial | Provider setup panel exists; there is no first-run flow for a machine with no agent installed. |
| Updater | done | Sparkle on macOS, in-app on Windows and Linux. |

## Transcript

| Item | Status | Notes |
| --- | --- | --- |
| Markdown rendering | done | Headings, lists, task lists, tables, blockquotes, rules, images, links. |
| Syntax highlighting | done | Fixed language set; see `src/md/highlight.rs`. |
| Code block copy | done | Keyboard control per block. |
| Tool-call rows | done | Grouped, with per-item disclosure, arguments and output sections. |
| Inline diffs | done | File-change activities render hunks, not just a summary. |
| Reasoning display | done | Live peek while streaming, expandable afterwards. |
| Turn folding | done | "Worked for X", activity groups, changed-file lists. |
| Virtualization | done | `list()` over the transcript. |
| In-transcript find | done | Case-insensitive literal search with prev/next. |
| Selection and copy | done | Copy message, copy selection, add selection to composer. |
| Navigation rail | done | Per-turn ticks with hover previews. |
| Search across sessions | deferred | The sidebar filters by title. There is no cross-session full-text search. |
| Subagent transcripts | done | Nested output panes. |

## Composer

| Item | Status | Notes |
| --- | --- | --- |
| Attachments | done | Drag-and-drop, paste, image capture, attachment chips. |
| Drafts | done | Persisted per session and project. |
| Slash-command autocomplete | done | Including provider-native commands. |
| `@` file mentions | done | |
| Model picker | done | Provider tabs, favorites, search. |
| Model traits | done | Reasoning effort, service tier, context window. |
| Access modes | done | Plan, Supervised, Auto-accept edits, Auto, Full access. |
| Agent presets | done | Standard, Code, Minimal, Creator, Custom. |
| Goals | done | Set, pause, resume, clear. |
| Queue and steer | done | Enter queues, modifier-Enter steers. |
| Question cards | done | Multi-question with back / next / submit. |
| Permission prompts | done | Allow once / session / always / deny. |
| Computer-use permission card | done | |
| Voice input | deferred | No dictation or speech anywhere in the app. |

## Agent task list

| Item | Status | Notes |
| --- | --- | --- |
| Whole-list providers | done | OpenCode `todo.updated`, Codex `turn/plan/updated`, ACP `plan`, DeepSeek `todo/write`. |
| Tool-call providers | done | Claude and Amp `TodoWrite`, Pi and Oh My Pi `todo`. |
| Claude Code task tools | done | v2.1.268's `TaskCreate` / `TaskUpdate` / `TaskList` / `TaskGet`, including the namespaced `mcp__*` spellings, rebuilt across calls by `activity::TodoAccumulator`. |
| Footer meter | done | `{completed}/{total}` chip opening a popover, capped at 8 rows. |
| Tray above the composer | done | Windowed around the in-progress step, collapsible per session. |
| OpenCode 2 | deferred | Publishes no task-list event on the adopted service stream, so the panel is correctly empty for it. Not a defect. |
| Forcing Claude's task tools | deferred | The CLI's `Task*` tools are absent by default on current models. Waku does not set `CLAUDE_CODE_ENABLE_TODO_TOOLS`; the list appears only when the provider publishes one. |

## Sessions and sidebar

| Item | Status | Notes |
| --- | --- | --- |
| Grouping and ordering | done | By project or by date bucket, newest or oldest first. |
| Search and filter | done | Title filter in the sidebar header. |
| Archive and delete | done | Archived sessions hidden behind a toggle. |
| Inline rename | done | |
| Multi-project | done | |
| Projectless tasks | done | |
| Status colors | done | Working, Waiting, Background, Failed. |
| Pinning | deferred | No pinned sessions. |
| Folders | deferred | Sessions group by project and date only. |
| Fork, rewind, undo turn | done | Per-message actions. |
| Cross-session search | deferred | See Transcript. |

## Orchestration and work

| Item | Status | Notes |
| --- | --- | --- |
| Background processes and subagents | done | Summary, list, detail, output viewer, stop and stop-all. |
| Worktrees and branches | done | Pick, create, switch, with worktree-aware gating. |
| Commit and push | done | Generated commit messages, include-unstaged toggle. |
| Review diff | done | Source selector, file tree, expand context, truncation note. |
| File browser and editor | done | Markdown preview and source toggle. |
| Editor find and replace | done | Regex, case, whole word. |
| Terminal | done | Scrollback, selection, links, copy and paste menu. |
| Embedded browser | done | Omnibox, navigation, open external. Not available on every platform. |
| Computer use | done | Screen access, per-app allowlist, take-control overlay. |
| Skills | done | Library page with enable, disable, delete, reveal. |
| Project memory | done | `MEMORY.md` facts, remember and forget. |
| Scheduled or recurring work | deferred | Nothing runs an agent on a cadence. |
| Agent-to-agent delegation | deferred | Agents cannot spawn or message other sessions. |
| Service proxy / dev-server URLs | deferred | No per-worktree port allocation, so parallel agents can collide on a port. |
| Pull requests | deferred | No forge integration at all: no PR status, checks, or creation in the app. |

## Providers

| Item | Status | Notes |
| --- | --- | --- |
| Claude Code | done | Streaming input, permissions, resume, subagents, background tasks, task list. |
| Codex CLI | done | App-server JSON-RPC, plans, generated images, thread goals. |
| OpenCode | done | v1 and v2, permissions, task list on v1. |
| ACP agents | done | Copilot CLI, Cursor, Fx, Grok Build, Kimi Code. |
| Pi and Oh My Pi | done | RPC mode, extension dialogs. |
| Amp | done | Streaming-JSON sessions. |
| DeepSeek Harness | done | Typed client API. |
| Detection and install | done | PATH probing, install actions, per-provider binary override. |
| Per-provider accounts | deferred | One credential set per provider. There is no second account to switch between. |
| MCP client | deferred | Waku serves MCP but does not consume one, and has no MCP server management UI. |

## Daemon and clients

| Item | Status | Notes |
| --- | --- | --- |
| Daemon | done | Local management, exposure, pairing, token, connected clients, Tailscale hint. |
| Desktop client | done | This application. |
| Web client | done | Connect screen, transcript, composer, right panel, command palette, settings. |
| Mobile client | done | Task list, new task, session view, settings, skills, usage, daemons. |
| Protocol bindings | done | TypeScript generated from the Rust types; `bun run protocol:check` gates them. |
| Multi-device session ownership | deferred | A session belongs to the daemon that owns it. The sidebar cannot list sessions across several daemons in one tree. |
| Scoped permissions | deferred | The daemon token grants full access. There is no read-only or workspace-scoped credential. |

## Platform, release, and i18n

| Item | Status | Notes |
| --- | --- | --- |
| macOS | done | Signed, notarized, Sparkle updates. |
| Windows | done | In-app update, tray. |
| Linux | done | Signed in-app updates. |
| Android | done | APK with in-app update. |
| iOS | deferred | No iOS client. |
| Localization | done | English, Japanese, Simplified Chinese, with a test that fails if the key sets diverge. |
| Accessibility | partial | Keyboard operability and reduced-motion are honored where implemented. GPUI exposes no screen-reader tree, so assistive tech sees nothing. |

---

## Deferred, with the reason

Rows above marked **deferred** are deliberate, not overlooked. The ones worth
stating outright:

- **Split panes.** The pane renderer already supports independent islands; what
  is missing is composition above it. Deferred until a surface needs to be
  visible beside the transcript for a whole task rather than on demand.
- **Pull requests and forge integration.** Every forge has its own auth and API
  surface. Deferred until the read-only half (status and checks for the current
  branch) can be shipped without the write half.
- **Service proxy and per-worktree ports.** The fix for parallel agents
  colliding on a dev-server port. Requires a port allocator and a host router
  the daemon does not have yet.
- **Voice.** A large platform-specific surface with no reuse elsewhere in the
  app.
- **Per-provider accounts and scoped daemon permissions.** Both need a
  credential model richer than one token per provider. The daemon already owns
  the storage; the work is the model, not the plumbing.
- **Scheduled work and agent-to-agent delegation.** Both are new subsystems
  rather than extensions of an existing one.

## Auditing this file

The rows are meant to be checkable. When changing a surface:

1. Find its row and correct the status and the note.
2. If a gap closes, move the row out of `deferred` and say what covers it now.
3. If a new gap opens, name it in the row in the same change rather than
   leaving it to be found later.

A row that no longer matches the tree is worse than a missing row, because it
is believed.
