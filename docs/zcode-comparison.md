# ZCode → Kerenzikov: what is worth taking

**Date:** 2026-09-13
**Scope:** Feature comparison between [ZCode](https://zcode.z.ai) (Zhipu's GLM-5.3 "Agentic Development Environment") and Kerenzikov (this repo), covering desktop and mobile.
**Purpose:** A reviewable backlog of candidate features. Nothing here is implemented; this is a shortlist to re-check and prioritize later.

---

## Method and confidence

- **ZCode side:** read from its public documentation and changelog (`zcode.z.ai/en/docs/*`, `zcode.z.ai/en/changelog`). Version referenced: **3.11.2**. These are *documented* behavior, not observed behavior — I did not run ZCode. Treat specifics (hook protocol details, Goal Mode verification rules) as "as documented."
- **Kerenzikov side:** verified directly in this repository's source. Every claim about what Kerenzikov *lacks* was confirmed by a search that returned no matches, not by assumption. File paths below are real and were checked.
- **Fetch status:** `git fetch` could not complete on 2026-09-13 — `github.com` was unreachable from this machine on both port 22 and port 443 (connection timed out). Local `main` was last known even with `origin/main` (0 ahead / 0 behind). Re-run the fetch when the network is back before acting on this.

### The framing that matters

These are different species, which shapes what is transferable:

| | ZCode | Kerenzikov |
|---|---|---|
| Shell | Electron | Native Rust / GPUI |
| Model coupling | GLM-5.3 only | Provider-agnostic (9 CLIs) |
| Architecture | Monolith | Daemon + thin clients (Rust protocol) |
| Platforms | Desktop only | Desktop, Android/mobile, web |
| Business model | Model subscription | Free, local-first |

**ZCode has no mobile app.** Its phone story is a browser page that remote-controls the desktop window, plus a WeChat/Feishu bot bridge. Kerenzikov's native Expo app already does more than that. So ZCode *validates* Kerenzikov's daemon-remote-control direction rather than offering a mobile feature set to import.

---

## Part 1 — ZCode feature inventory (from docs)

### Core
- **ZCode Agent** — default agent; `@` file/folder mentions, `#` past conversations, `/` saved commands, `$` skills, `+` context menu.
- **Goal Mode** (`/goal`) — one objective per session; auto-verifies completion each round against real evidence (changed files, command output, test results — not plans or effort), auto-starts the next round on failure, stops on success. Checklist grouped by iteration. `pause` / `resume` / `clear` / `replace`. Refuses to combine with Plan mode; refuses to start mid-turn. Halting a task auto-pauses the goal.
- **Four execution modes**, cycled with **Shift+Tab**: Ask before changes (default), Edit automatically, **Plan**, Full access.
- **Thought level** — Low / High / Max (Max default for GLM-5.3), per-model.
- **Side conversations** — right-panel tab with its own full conversation, inheriting main history as context. Opened via selection, `/side`, `/btw`. No goal mode, no message editing, no forking. Destroyed on tab close / parent delete / quit.
- **Forking** — from any cleanly completed assistant message; inherits history, model, thought level, goal progress. Conversation only, not files.
- **Compaction** — `/compact`; forking is blocked while it runs.
- **Selection as context** — select text in a reply, reasoning, code block, or tool result → "Add to current task" toolbar. Caps on length/count/size; single-line only. Streaming selections freeze at click time.
- **AGENTS.md** — reads `~/.zcode/AGENTS.md` (global) + workspace `AGENTS.md` (primary). No directory-level merging, no child scanning, no import expansion.
- **Project Memory** — agent-written, project-scoped facts in four categories (User / Feedback / Project / Reference). Background extraction after a successful turn; auto-injected in later sessions. Off by default, local Markdown only, no management UI, main-conversation only, remote workspaces unsupported, index has a size cap.
- **Browser driving** — agent operates the built-in browser (open, click, fill, screenshot) via the official Browser Use plugin. On by default.

### Workspace and tasks
- **Three task views** — Grouped / Workspace / Timeline; sort by created or updated.
- **Task groups** — custom named groups, 7 color markers, drag to group/reorder, right-click Move to Group / Remove / Move to top, collapse all.
- **Archive** — auto-archive candidates (no unread, no pin, older than retention). Retention configurable 3/7/14/30 days. Per-row Unarchive / Delete. Pinning supported.
- **Quick Actions** — the sidebar search box doubles as a launcher (new chat, open folder, search files, switch theme, MCP servers, toggle terminal) with shortcuts shown.
- **Workspace file tree** — name/path filter, **"Show changed files only"**, Git status markers with directory rollup, click to preview, double-click to open in editor, **drag a file into chat to insert a reference**, context menu (Open / Open With / Add to Chat / Copy Path / Reveal).
- **Git Graph** — read-only commit graph, branches side by side, merges shown, Load more. View only; no branch switching from the graph.
- **Repo Wiki** — generated architecture guide (identity, main paths, core modules, boundaries, data flow, risk areas) with every claim linked to file + line range. Mermaid diagrams themed and zoomable. Auto-refreshes at end of turn only if code changed. Stored at `~/.zcode/v2/repo-wiki/<workspace-hash>/wiki.json` — never in the repo. Excludes `.git`, deps, build output, gitignored paths, sensitive-named files, symlink targets. One language version per repo; no per-page regen; no version history.
- **Remote Development** — SSH (all platforms), WSL (Windows only), Docker container (all platforms). Syncs user-level Skills / MCP / Plugins to the remote, skipping anything already present. Mobile cannot create these connections.

### Extensibility
- **Subagents** — built-in `general-purpose` (all tools) and `Explore` (read-only). Custom subagents in `~/.zcode/agents/<name>.md` (frontmatter: `name`, `description`, `model`, `thoughtLevel`, `color`, `tools`/`disallowedTools`, `maxTurns`, `injectAgentsMd`, `mcpServers`). Foreground (parallel, main waits) vs background (main continues; read-only tools only). Subagents cannot nest. Changes require a new session.
- **MCP** — user + workspace scope; stdio and HTTP/SSE remotes; OAuth for remotes; import from [CC] / Codex / OpenCode / `.agents`. Load order workspace→user with `.zcode` shadowing `.agents` entirely.
- **Skills** — `SKILL.md` with required `name` + `description` (≤1024 chars, or the skill is dropped), body ≤100KB. `~/.zcode/skills/<name>/SKILL.md`. Invoked with `$`. Shared metadata budget — too many skills degrades injection to names only. Import from other agents via symlink or copy.
- **Commands** — reusable saved prompts.
- **Plugins** — package skills + commands + hooks + MCP servers; custom marketplace sources (GitHub repo, git URL, local dir). Plugin hooks appear read-only in settings.
- **Hooks** — local subprocess protocol: one JSON line to stdin, response via stdout + exit code. Events: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PostToolUseFailure`, `Stop`. PreToolUse can allow/ask/deny and fully replace tool input (re-validated); Stop can block continuation, max 3 consecutive times. Executors `process` (argv) and `command` (shell); `async` is fire-and-forget. Defaults: 60s timeout, 32KB stdout cap. **Project-level hooks are ignored wholesale** (logged as `config_project_hooks_ignored`) — a defect, not a design.
- **Usage Stats** — plan quota, model consumption, tool calls.

### Safety
- **Approvals** — Allow / Always Allow / Reject / Always Reject, plus narrower "Allow for this session" and "Always allow for this project." Pending requests are task-scoped and survive switching away; the sidebar can flag them.
- **Question auto-continue** — ordinary questions show a 5-minute countdown then auto-continue on the agent's judgment, tagged "Unanswered, auto-continued." Disableable. Permission requests and plan approvals always wait.

### Other
- **Terminal** — built-in, **Ctrl/Cmd+J**; also a tab in the preview panel. DevTools entry for the browser.
- **Background commands** — long-running commands (dev servers, full test suites) run without blocking the turn; subagents too.
- **Command Center** — **Ctrl/Cmd+K**; commands, conversations, files, settings, terminal, theme, MCP.
- **Enhanced Find and Grep** — bundled faster replacements, on by default (Windows: grep only).
- **PDF** — native render with page nav, jump-to-page, zoom. Read-only, no annotation.
- **Automations** — scheduled tasks (hourly/daily/weekdays/weekly/monthly/custom, optional end date, local timezone), bound to a local project, cap 20 across all projects, machine must stay awake. Sessions bound to the task deliver results back to the same session.
- **Idle-time tasks** — queue that runs during spare compute, free, no quota. Requires an active Coding Plan. Not transferable without a server.
- **Remote Control** — QR-code pairing; phone attaches to the whole desktop window; one phone page at a time; the connection URL *is* the credential; closing the popup does not end the session.
- **Bot Channel** — WeChat / Feishu (not Telegram, despite the landing page). Per-bot reply granularity, workspace access scope, enable/disable. Feishu replies as a streaming card updated in place so tool output never floods the chat.

---

## Part 2 — Kerenzikov current state (verified in source)

### Desktop (`src/`)
Sidebar with session history (`src/app/sidebar.rs`), virtualized transcript (`src/app/transcript_view.rs`, `src/app/transcript.rs`), composer (`src/app/composer.rs`), tabbed right panel — Browser / Terminal / BackgroundWork / Files / Diff / File (`src/app/right_panel.rs`), 7-page settings (`src/app/settings.rs`), command palette (`src/app/command_palette.rs`), MRU task switcher (`src/app/task_switcher.rs`), commit dialog (`src/app/commit_dialog.rs`), goal dialog (`src/app/goal_dialog.rs`), image preview, permission and user-input panels, computer-use overlay, toasts, conversation navigation rail, embedded browser (`src/browser.rs`), native terminal (`src/terminal.rs`), Windows tray (`src/tray.rs`).

- **Composer:** attachments (OS drag-drop, paste, daemon upload), `@`-mention file autocomplete (50k cap), provider-discovered slash commands, local built-ins `/resume` `/fast` `/memory` `/goal` (`src/app/composer.rs:2116-2119`), model picker with favorites, model traits (reasoning effort / service tier / context window), agent presets, four runtime modes, queue + steer + edit queued messages, two-stage Escape stop, goal chip, branch/worktree/project selectors, per-session draft persistence.
- **Transcript:** row virtualization with incremental splices, custom markdown engine (`src/md/` — incremental parser, paint-only highlighter, streaming marker mending `mend.rs`, streaming fade veil `veil.rs`, text selection `selection.rs`), inline activity diffs, full review diff with 6 sources, normalized activity kinds, live reasoning peek, turn folding, per-turn Git checkpoints, message edit-and-resubmit, turn undo, transcript search (`src/app/transcript_search.rs`).
- **Sessions:** create/rename/delete, project + projectless tasks, presets on new task, fork from any response, resume external CLI sessions, local vs isolated Git worktree, usage/spend screens (`src/app/usage_page.rs`, `src/app/usage_meter.rs`), background work monitor (`src/app/background_work.rs`), system notifications, idle session reaping.
- **Memory:** `crates/waku-client/src/project_memory.rs` — `MemoryFact`, `load_context`, `remember`, `forget`, `looks_like_secret`, `extraction_prompt`, `parse_extracted`. Per-project, secret-screened.
- **Other:** `waku_js_repl` MCP server (`src/js_repl.rs`), computer use (macOS-only, debug-gated), `src/md/veil.rs`, daemon blob store, provider slash-command probing (`crates/waku-core/src/slash_command_catalog.rs`), usage history scanning provider transcripts.

### Mobile (`apps/mobile/`) — Expo SDK 57 / RN 0.86 / Expo Router
Screens: home, new-task, session, daemons, daemon-editor, settings, skills, usage. Components: task drawer (grouping, ordering, message search), session view, mobile composer, transcript list/rows, activity sheet, task surface sheet (terminal via libghostty / files / review), diff view, option sheets, agent-preset menu, daemon picker, remote project picker, glass surfaces, own markdown renderer.

Ahead of desktop/web: multi-daemon profiles with keychain storage, connection supervision (jittered backoff, foreground heartbeat, outage model with `interrupted`/`attempts`/`nextRetryAt`), native terminal, haptics, Liquid Glass, camera/library attachments, cross-device composer drafts.

### Web (`apps/web/`) — TanStack Start on Cloudflare Workers
Full sidebar, command palette, virtualized transcript, 2134-line composer with `@`-mentions and slash commands, right panel (files / changes / terminal / background work), commit dialog with push, settings with i18n (en / zh-CN / ja), usage charts, goal dialog, file write.

### Shared (`packages/waku-client/`)
~140 generated protocol bindings, `WakuClient` WebSocket client (handshake, request correlation, sequence dedup, replay cursors), shared `event-reducer`, `transcript-presentation`, `composer-preferences`, `provider-probe-cache`. This is the real cross-client consistency layer. Styling is mirrored by hand, not shared.

---

## Part 3 — Gap analysis

### Tier 1 — high value, fits the existing architecture

#### 1. Plan mode
**Gap:** Kerenzikov deliberately removed it. `crates/waku-protocol/src/model.rs:333` defines `RuntimeMode` as `Ask | AutoAcceptEdits | Auto | FullAccess`, and the deserializer maps `"plan" | "ask" => Ok(Self::Ask)` with the comment that plan "was a combined read-only mode" that is kept readable "without retaining it as a product mode."
**Take:** reinstate Plan as a distinct mode — plan, wait for approval, then implement. Pairs naturally with the checkpoint/rewind machinery, which is already stronger than ZCode's.
**Effort:** Medium. Protocol enum + deserializer + composer control + provider mapping.

#### 2. MCP server management
**Gap:** total. The only MCP server is the internal `waku_js_repl`; `src/app/settings.rs` has no MCP surface at all.
**Take:** user vs. workspace scope, stdio + HTTP/SSE remotes, OAuth for remotes, and import from [CC] / Codex / OpenCode. `crates/waku-core/src/slash_command_catalog.rs` already probes those same CLIs' registries, so the import path is a short step.
**Effort:** Large. The biggest genuine capability gap for a coding-agent client.

#### 3. Hooks
**Gap:** none exist (the only "hooks" string in `src/` is a GPUI quit-hook comment).
**Take:** the subprocess protocol — JSON line to stdin, stdout + exit code back; `PreToolUse` allow/ask/deny with input replacement; `Stop` block-with-reason capped at 3; 60s timeout, 32KB cap. Belongs in the daemon, which already owns provider sessions.
**Effort:** Large, but self-contained and protocol-clean.

#### 4. Selection as context
**Gap:** Kerenzikov has selection in markdown (`src/md/selection.rs`) but only offers copy. No `add_to_chat` / selection-to-composer path exists.
**Take:** an "add to composer" action on a selection in a reply, reasoning block, code block, or tool result.
**Effort:** Small. The hard part already exists.

#### 5. QR-code pairing for mobile
**Gap:** mobile onboarding requires typing a daemon address and pasting a token through the daemon picker sheet into the keychain.
**Take:** ZCode's scan-to-pair. Highest-ratio mobile improvement available.
**Effort:** Small–medium (desktop generates + displays; mobile camera scan → profile).

### Tier 2 — worth doing

| Feature | Gap in Kerenzikov | Notes |
|---|---|---|
| **Side conversations** | None | Right-panel tab with its own conversation inheriting main history; opened from a selection, `/side`, `/btw`. Right panel already has tabs, so this is a new tab, not new chrome. |
| **Task groups + archiving** | Groups by Project/Updated with collapse, but no custom groups, no pin, no archive | ZCode: 3 view modes, 7 color markers, drag reorder, archive with 3/7/14/30-day retention. Long histories currently just grow. Self-contained UI work. |
| **Undo / Reapply per reply** | Rewind is conversation + files together | ZCode splits "conversation only" from "conversation + files" and classifies each file safe / unsafe / ignored before writing anything, all-or-nothing to avoid partial reverts. The classification and the all-or-nothing rule are the parts worth stealing. |
| **Git graph** | No graph view (branch selector + review diff only) | Read-only commit graph in the branch switcher. Self-contained. |
| **Approval allowlists** | Four runtime modes cover the coarse setting; computer use has an always-allowed apps list; per-tool remembered decisions appear absent | ZCode: Allow / Always Allow / Reject / Always Reject + session- and project-scoped variants. Confirm against the permission path in `src/app/composer.rs` before scoping. |
| **Question auto-continue** | Not found | 5-minute countdown then auto-continue, tagged, disableable. Permissions and plan approvals always wait. Good for unattended runs. |
| **Goal mode depth** | `/goal` is Codex-gated via `parse_goal_submission(session.provider, ...)` (`src/app/composer.rs:2142`) and largely a status/budget chip | ZCode's verification loop (evidence-based, per-round, auto-continue) is the model to study. Bounded by provider support here. |
| **Changed-files filter + drag-to-chat** | No "changed only" filter; `stage_dropped_files` is OS drag-drop, not file-tree drag | ZCode filters the file tree to Git-changed files and lets you drag a file into the composer as a reference. Cheap, pairs well for pre-commit review. |

### Tier 3 — bigger lifts, situational

- **Repo wiki** — per-workspace architecture guide with file+line-linked claims, auto-refreshed only on real code change, stored outside the repo. Distinctive; substantial build.
- **Plugins + marketplace** — package skills/commands/hooks/MCP with custom marketplace sources. Large scope; Kerenzikov has a skills page but no distribution mechanism.
- **Scheduled tasks** — daemon-level scheduler spawning a session at time T. Transferable in principle; the free tier it is bundled with is not.
- **Browser element picker** — no `element_pick` / DOM inspection context path exists; the embedded browser could let you pick an element as context.
- **Compaction** — no `/compact` command found. Kerenzikov shows a context gauge; compaction may be delegated to providers. Worth confirming whether it should be exposed.
- **PDF rendering** — only file-type icons exist, no PDF view.

---

## Part 4 — Where Kerenzikov is already at parity or ahead

Rewind and conversation-aware Git checkpoints; background work and subagent monitoring (`src/app/background_work.rs`, `BackgroundWorkKind::Subagent`); forking from a response; streaming markdown with veil and marker mending (`src/md/`); usage/spend screens; skills management; project memory with secret screening; native terminal; embedded browser; Windows tray; i18n. Provider breadth (9 CLIs) exceeds ZCode's single-vendor coupling.

On mobile, Kerenzikov is clearly ahead: multi-daemon profiles with keychain storage, real connection supervision, and native terminal/files/review surfaces. ZCode's "one phone page at a time" restriction and its inability to create SSH/WSL/Docker connections from the phone are limitations, not features.

---

## Part 5 — What not to copy

- **Idle-time tasks / free surplus compute** — depends on Zhipu assigning models server-side against a subscription. No server here.
- **GLM-specific integration** and 1M-context claims.
- **Coding-plan pricing and quota UX.**
- **WeChat / Feishu specifically** — the bot *pattern* generalizes (Telegram, Discord, Slack); the vendors do not.
- **Electron architecture.**
- **Project-level hooks being silently ignored** — a defect, not a design. If hooks are built, make project-level hooks work.

---

## Part 6 — Suggested order

1. **Plan mode** — small, fills a deliberate regression.
2. **Selection as context** — small, high leverage, reuses `src/md/selection.rs`.
3. **MCP management** — largest genuine gap; `slash_command_catalog.rs` gives a running start.
4. **QR pairing for mobile** — small, outsized onboarding win.
5. **Hooks** — larger, but protocol-clean and daemon-owned.
6. **Task groups + archive**, **Undo/Reapply**, **Git graph** — self-contained UI work, can be parallelized.
7. **Side conversations**, **Goal mode depth**, **Repo wiki** — evaluate after the above.

## Re-check checklist

- [ ] `git fetch` when GitHub is reachable; confirm local `main` vs `origin/main`.
- [ ] Re-verify ZCode feature specifics against the live app if a build is available — the docs are the only source used here.
- [ ] Confirm the approval-allowlist gap by reading the permission path in `src/app/composer.rs`.
- [ ] Confirm whether compaction is provider-delegated or absent.
- [ ] Re-read `crates/waku-protocol/src/model.rs:333` before reintroducing Plan mode — the deserializer's `"plan" | "ask"` mapping must keep old state files readable.
