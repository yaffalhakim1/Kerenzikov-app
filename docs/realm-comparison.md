# Realm → Kerenzikov: what is worth taking

**Date:** 2026-10-08
**Scope:** Feature comparison between [Realm](https://realm.computer/) (`31Carlton7/realm`, "one workspace for every coding agent, on your Mac") and Kerenzikov (this repo), covering desktop, mobile, and web.
**Purpose:** A reviewable backlog of candidate features. Nothing here is implemented; this is a shortlist to re-check and prioritize later.

> **Relationship to the other comparison.** `docs/t3code-comparison.md` remains the
> reference for coding-agent *workflow* and transcript presentation, because T3 Code
> is open source and its behavior can be read rather than inferred from marketing.
> Realm is the reference for *daemon-side* capabilities — MCP brokering, scheduled
> runs, delegation — which T3 does not have. The two do not overlap much; read both.

---

## Method and confidence

- **Realm side:** the marketing site ([realm.computer](https://realm.computer/), `/features`, `/changelog`), the GitHub README and `AGENTS.md`/`design.md`, and the repo tree read through the GitHub API. Realm is **not** open source in a license sense but the repository is public and its README is unusually detailed, so most load-bearing claims below are read from source or docs rather than marketing. Confidence is marked per claim.
- **Kerenzikov side:** verified directly in this repository. Every "absent" claim was confirmed by a search that returned no matches, not by assumption. File paths are real and were checked at the commit this doc is written on (`0.1.53`).
- **Not done:** Realm was never run. Timing, animation feel, and real-world reliability are "as documented" and marked where they matter.

### The framing that matters

These are different species, which shapes what is transferable.

| | Realm | Kerenzikov |
|---|---|---|
| Shell | Electron + web renderer | Native Rust / GPUI, plus RN mobile and a web client |
| Age | Created 2026-08-23, ~6 weeks old | Long-lived fork of `egoist/waku` |
| Velocity | ~1,570 commits in 6 weeks, solo author (Carlton Aikins) | Single-owner fork |
| Architecture | `realm-server` (Node) owns execution; Electron client is thin | Daemon owns execution; clients are thin |
| Provider model | Claude + Codex adapters, everything else one generic ACP adapter | 13 providers across 7 transports |
| Platform reach | macOS, Apple silicon only | Windows, Linux, macOS, Android, web |
| Data | `~/Realm` — SQLite + files, no account | `~/.waku` — SQLite + files, no account |

**Both bets are the same bet** — a server owns execution and the clients control it.
That is why the daemon-side ideas below transfer: they land on an architecture
Kerenzikov already has. Realm is also local-first with no account, same as
Kerenzikov, so nothing here drags in a hosted service.

**The real signal is velocity, not depth.** Six weeks to v2.0.3 with a
professional `docs/superpowers/specs/competitive-audit.md` (they audited T3 Code,
Synara, Ara, Universe by reading source) and a rigorous `design.md` means someone
with taste and discipline shipping feature breadth fast, almost certainly
AI-assisted. Realm will out-ship Kerenzikov on *surface area*; Kerenzikov wins on
*performance* (native, not Electron) and *platform reach* (Windows-first, where
Realm does not exist). Sort the list by idea, not by Realm's polish.

---

## Part 1 — Realm feature inventory

Read from the site and README.

### The core object: profile → space → session

- A **profile** holds **spaces**; a space points at one or several checkouts and
  its sessions work there.
- Every space sits in **one sidebar** in one list; **Needs you** heads it with
  every session waiting on a permission or a question, from every space and every
  profile.
- Each space can run inside a **macOS Seatbelt policy** (three postures, off by
  default), with checkouts writable and credential folders unreadable.

### Agent sessions

- Claude and Codex have native adapters; Cursor, Gemini, OpenCode, GitHub Copilot,
  goose, Qwen Code, Grok and others share **one ACP adapter**.
- Realm **never asks for an API key** — it drives the CLI you already have on
  whatever plan you already pay for.
- **Sub-agent delegation**: an agent can hand work to other agents, each a real
  session, in the checkout, a named environment, or a fresh worktree. A sub-agent
  asks for permission like any other session. **Two levels deep, and that's it.**
  Every sub-agent sends a final report to the agent that started it.

### MCP gateway

- Linear, Notion, Slack, GitHub, Jira, Figma, Sentry connect in one click; a
  connection belongs to the **space**, not an agent.
- Every session reaches them through **one Realm endpoint**. The agent gets the
  tools and never the credential: it calls Realm, Realm calls the server.
- **Every call is logged** with its arguments and result.
- OAuth connections are encrypted with a key in the macOS Keychain. A key pasted
  into a custom MCP server is stored in plain text, and the app says so at the field.

### Browser panes and saved sign-ins

- A browser pane that stays signed in, which agents can read and drive. It stops
  at a consent screen unless the space says otherwise.
- **Saved sign-ins**: you enroll passwords in Settings; an agent can ask Realm to
  *generate* one. Values live in the OS Keychain, decrypted only in the main
  process, **never readable back** — not by you, not over IPC, not through the
  gateway. Every fill is gated three ways: the pane's origin must exactly equal
  the credential's origin, you approve that specific fill, and Touch ID confirms.
  Fills are audit-logged (origin, id, outcome, never the value). 2FA is explicitly
  out of scope.

### Work that outlives the window

- `realm-server` keeps running after you close the window; a long turn finishes
  whether you are watching or not.
- **Tasks can run on a schedule**, and every run is a real session you can read
  and pick up from.
- Each turn is bracketed by a **checkpoint**; restoring one puts the files back,
  and for Claude it rewinds the conversation too.

### Review, import, and the rest

- **PR review without a GitHub token**: lists your PRs through your own `gh`, opens
  a diff, runs a read-only reviewer on a chosen model/effort, and **nothing reaches
  GitHub until you press Submit review**.
- **Import** from Claude Code, Codex and Cursor on disk: transcripts, memory fact
  folders, user-level skills. The agents' directories are read-only; only the
  previewed keys are written.
- **Code graphs (Graphify)** via a third-party Python CLI, exposed as an MCP server
  and rendered as an HTML page in the documents pane.
- **Visual replies**: an agent can answer with a self-contained HTML page (chart,
  table, diagram, collage) rendered above the written reply, theme-aware and
  sandboxed.
- **Split panes**: sessions beside one side panel for terminals / browsers /
  documents.
- **Usage**, **skills**, **signing/notarization**, and a **signed auto-update feed**.

---

## Part 2 — Kerenzikov current state (verified in source)

Already present, and a precondition for the items below:

- Daemon + thin clients, with desktop (`src/`), mobile (`apps/mobile/`), and web
  (`apps/web/`) sharing one protocol; the daemon owns execution
  (`crates/waku-daemon`, `crates/waku-core/src/server.rs`).
- **Durable daemon**: it survives the desktop window and keeps streaming into
  transcripts (`docs/providers.md`, "Runtime lifetime in the app").
- **Per-turn Git checkpoints and conversation rewind/branch**, daemon-owned, across
  every provider that supports it (`crates/waku-core/src/checkpoint.rs`,
  `ProviderResumeCursor` in `crates/waku-protocol/src/model.rs`).
- **Native browser surface**: WKWebView on macOS, composition-hosted WebView2 on
  Windows (`src/browser.rs`, ~2,469 LOC), with `evaluate_script` already in use.
- **Right panel** with tabs: Browser, Terminal, Files, Review, file editor, plus
  background-work rows (`RightPanelSurface` in `src/app.rs`, `src/app/right_panel.rs`).
- **Import** of external provider sessions (`ProviderSessionHistory` in
  `crates/waku-protocol/src/model.rs`).
- **Skills page, project memory with secret screening, usage page, computer use,
  Windows tray, i18n in three locales.**
- **Undo toasts** (`ToastUndo`, `show_undo_toast`).
- **Signed auto-update feed** (`src/updater.rs`).
- **13 providers across 7 transports** (`docs/providers.md`).

---

## Part 3 — Gap analysis

### Tier 1 — architectural, fits the daemon

#### 1. MCP credential gateway

**Gap:** Kerenzikov wires MCP only internally, for Computer Use — the drivers inject
`waku_js_repl` into Codex, OpenCode and Grok (`crates/waku-core/src/driver/support.rs`).
There is no third-party MCP brokering, no per-space connection, no credential
isolation, and no call log.

**Take:** connections belong to a project/space, every session reaches them through
one daemon endpoint, the agent gets tools and never the token, and every proxied
call is logged. This is the single largest gap, and the daemon already owns the
per-session runtime and the provider injection points.

**Why first:** it is the one Realm feature with no Kerenzikov equivalent at any
depth, and it is the feature most likely to make a security-conscious user choose
one app over another. It also composes with the browser pane and with saved
sign-ins (item 6): all three are "a secret the agent may use but never see."

**Effort:** large — an MCP hub plus per-provider MCP-server injection, which the
drivers already do for the Computer Use server.

#### 2. Sub-agent delegation across models and harnesses

**Gap:** Kerenzikov *monitors* the provider's own subagents
(`src/app/background_work.rs`, `BackgroundWorkKind::Subagent`) but cannot originate
a fan-out. A session cannot start a child session on a chosen provider and collect
its report.

**Take:** a session starts sub-agents on chosen models through whichever harness
runs them, each is a real session, two levels deep, each returns a final report
with its own line in the transcript. The two-level cap is a good default — it is
the difference between a feature and an unbounded tree somebody has to babysit.

**Why:** it is the clearest "workspace" feature Realm has that Kerenzikov lacks,
and the daemon already manages sessions and provider selection.

**Effort:** medium-large — session-spawning RPC plus delegation bookkeeping and UI.

#### 3. In-app PR review without a GitHub token

**Gap:** the Review tab is local-diff only (`src/review_diff.rs`,
`src/app/activity_diff.rs`). There is no PR listing, no in-app reviewer, no
submit-review flow.

**Take:** list PRs through the user's own `gh` (so Kerenzikov never holds a token),
open a diff, run a read-only reviewer on a chosen model/effort, keep findings local
until **Submit review**.

**Why:** it reuses the diff renderer that already exists and adds a high-value
workflow. Shelling out to `gh` keeps the trust boundary identical to Realm's.

**Effort:** medium.

#### 4. Scheduled / recurring tasks

**Gap:** the daemon is durable but has **no scheduler** — a search for
schedule/cron/recurring returns only unrelated timer code.

**Take:** tasks run on a schedule, and every run is a real session you can read and
pick up from. The durable daemon is the hard part and Kerenzikov already has it;
this is a timer plus a task definition.

**Effort:** medium.

### Tier 2 — self-contained, visible

| Feature | Gap in Kerenzikov | Notes |
|---|---|---|
| **Needs-you inbox** | Permission and question events exist, but there is no top-of-sidebar aggregation across projects | `SessionStatus::Waiting` and `Background` already model the states (`crates/waku-protocol/src/model.rs`); this is a view. Cheap, high daily value. |
| **Saved browser sign-ins** | Native browser pane exists, no credential store | Origin-pinned, OS-keychain-backed, never readable back, audit-logged. Native Rust → Windows Credential Manager / macOS Keychain, not Electron `safeStorage`. |
| **Agent-readable browser pane** | `evaluate_script` is used internally for reload/exec only (`src/browser.rs`), not exposed to agents | Gives agents a real browser without a separate Playwright dependency. Pairs with the MCP gateway. |
| **Split panes** | Right-panel surfaces are siblings, no pane model (`RightPanelSurface`, `src/app.rs`) | Self-contained UI; the surface enum already exists. |
| **Visual replies** | Only file/markdown preview (`src/app/right_panel.rs`) | Agent writes a self-contained HTML page rendered above the reply, theme-aware and sandboxed. Reuse the existing WebView2/WKWebView surface — GPUI gives no sandboxed renderer for free. |

### Tier 3 — process / cheap

- **Profiles** — Realm's top container. Sits above the sidebar; would need a data
  model change, so it is only worth it if multi-project isolation becomes a goal.
- **Honest-uncertainty copy** — zero code. Adopt the rule that a status line never
  claims more than is known.
- **Competitive-audit discipline** — Realm keeps `docs/superpowers/specs/*-competitive-audit.md`
  reading competitors' source with a `[D]/[C]/[M]/[I]` confidence key. Kerenzikov
  already does this (`docs/t3code-comparison.md`); extending it is free.

---

## Part 4 — Where Kerenzikov is already at parity or ahead

- **Native shell.** GPUI rather than Electron, which is the stated reason the
  transcript stays smooth under a long session. Realm inherits Electron's memory and
  frame cost and cannot close this without a rewrite.
- **Platform reach.** Realm is Apple-silicon only; Kerenzikov is Windows-first with
  Linux, macOS, Android and web, and a signed Windows auto-update feed already wired.
- **Provider breadth** — 13 providers across 7 transports (`docs/providers.md`)
  against Realm's ~9 across 3 (Claude + Codex native, one ACP adapter).
- **Durable daemon + per-turn checkpoints with conversation rewind** — Realm has the
  durable server and per-turn checkpoints too, but Kerenzikov's rewind/branch is
  wired across providers that support it today.
- **Import from agent CLIs** — already present.
- **Usage, skills, memory, computer use, tray, i18n** — all present.

---

## Part 5 — What not to copy

- **Electron.** Realm's shell is the thing Kerenzikov's native shell beats.
- **Seatbelt sandbox.** macOS-only; Windows needs AppContainer/Job Objects, and
  Kerenzikov already delegates sandboxing to each provider's own flags. Not worth
  the platform split unless macOS ships again.
- **Graphify.** A third-party Python CLI. If a code graph is wanted, that is its own
  decision, not a Realm feature to port.
- **OAuth-in-Keychain as the only secret store.** Realm's own README admits pasted
  custom-server keys are stored in plain text. Do better: one store, encrypted, for
  every secret kind.

---

## Part 6 — Suggested order

1. **MCP credential gateway** — the architectural idea; the browser pane and saved
   sign-ins depend on the same "agent may use, may not see" primitive.
2. **Needs-you inbox** — tiny, immediate, reuses `SessionStatus`.
3. **Scheduled tasks** — medium, and the durable daemon is the hard half.
4. **In-app PR review** — medium, reuses the diff renderer.
5. **Sub-agent delegation** — medium-large, highest architectural value after MCP.
6. **Agent-readable browser pane** and **saved sign-ins** — medium, build on MCP.
7. **Split panes**, **visual replies** — medium, self-contained.
8. **Profiles** — evaluate after the above.

## Re-check checklist

- [ ] Confirm Realm's license and whether any code is intended to be reusable; the
      repository is public but the site says nothing about licensing.
- [ ] Re-verify the **MCP gateway's credential isolation** claim against a real run
      before treating it as the bar to beat.
- [ ] Confirm the **two-level delegation cap** is a product decision worth copying,
      not just an implementation limit.
- [ ] Re-check `SessionStatus` (`crates/waku-protocol/src/model.rs`) before building
      the Needs-you inbox — the states exist and should be reused, not duplicated.
- [ ] Read `src/browser.rs` and `crates/waku-core/src/driver/support.rs` before
      scoping the MCP gateway; the provider injection points already exist.
- [ ] Decide whether MCP connections belong to a project, a workspace, or a global
      scope. Realm uses "space"; Kerenzikov's nearest object is the project.
