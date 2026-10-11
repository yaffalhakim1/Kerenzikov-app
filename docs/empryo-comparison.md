# Empryo comparison

Recorded 2026-10-11, from the public materials: the
[Empryo repository](https://github.com/proxysoul/Empryo) (public SoulForge v2
core only — the current v3 desktop app is developed privately under a separate
license), [empryo.com/features](https://empryo.com/features),
[empryo.com/benchmarks](https://empryo.com/benchmarks) and
[empryo.com/morphs](https://empryo.com/morphs).

The question this answers: what does a 1.4k-star competing harness do that
Kerenzikov does not, and what is worth taking? Every finding below is
concept-level — their public core predates their current product, so there is
nothing to copy line-by-line even if we wanted to.

## What we already have (skip)

| Empryo | Kerenzikov equivalent | Verdict |
| --- | --- | --- |
| Genome (live repo map, ranked, sliced into prompts) | Daemon task-state graph; memory recall into prompts | Parity |
| Project memory + per-turn recall (≤3 memories) | `MEMORY.md` + automatic fact extraction on turn settle | We auto-extract; theirs is saved-on-demand. Ours is ahead |
| Checkpoints, rewind, fork | Git checkpoints per turn, provider-native rewind/fork, cross-device | Ours ahead |
| Steering (type while it works) | Steer into live provider turns + queued follow-ups | Parity |
| Plan mode | Plan runtime mode (read-only sandbox + collaboration mode) | Parity |
| Skills, MCP, subagent files, hooks (reads Claude Code's unchanged) | Skills shipped; AGENTS.md read | Theirs is broader: also reads Cursor/Claude Code agent defs and hooks. Partial gap |
| Themes (40+, JSON hot-reload) | 30+ themes via `data-theme` | Parity; their hot-reload is a small delight |
| Subscriptions (Claude, ChatGPT, …) + API keys + local models | Provider catalog with probing | Parity |
| Cost per session tracking | Context-token usage only | Gap, see below |
| Compaction near window end | Streaming session handling; transcript bounding | Partial — we don't measure or advertise it |

## Steal list

Ranked roughly by value-to-effort. "Where" names the subsystem that would
carry it.

### High value

1. **AST/LSP symbol edits.** Edits TypeScript/JavaScript by symbol name, so an
   edit cannot fail on whitespace or quotes; compound tools finish a whole job
   in one call ("rename, then confirm nothing still references the old name").
   Their published benchmarks attribute most of their 2-3× cost/time advantage
   to fewer wasted edit-retry round trips. Where: `waku-core` tool bridge;
   tree-sitter is already in the GPUI ecosystem (Zed's crates). Exposed as a
   provider tool through the existing skill/tool plumbing.
2. **Edit-then-check loop.** Error counts are measured before and after every
   edit, so the agent is told "you introduced 2 errors, you fixed 1" without
   being asked. The daemon already owns the workspace and runs the checks —
   a debounced `cargo check`/`tsc` after each edit, with the delta fed into
   the next prompt, is a large quality win with no UI.
3. **Verified public benchmarks.** Same bugs for every agent, a separate API
   key per agent, hidden tests grade the fixes, and — the distinctive part —
   each agent's *reported* cost is published next to what the provider
   *actually billed* that key. They found rivals under-report by 29-65%.
   Reproducible: harness, tasks and raw results are public, one command reruns
   a round. Where: a `bench/` harness over our daemon, pitting Kerenzikov
   against Claude Code/OpenCode on real merged bugs.
4. **Morphs.** One JSON file adds any mix of: panel, status chip, live feed,
   slash command, key chord, title-bar button, trigger (turn ended, clock,
   files changed), popup, palette entry, welcome buttons, accent — plus
   agent-side rules, read-only lookups, and **guards** that deny or ask on
   regex-matched actions (held until approved). Ships signed, declares a
   minimum app version, and stays off with an explanation if too old. This is
   the extension surface our desktop has no answer to; the guard half is
   independently valuable.
5. **Task router.** A cheap model searches and summarizes while a strong model
   writes code, per step. We already run cheap helper models for titling and
   memory extraction; the general version routes user-configurable tiers.
6. **Model fallback chains.** Each model carries its own backup list, so an
   overloaded provider does not strand the session. We have no retry/fallback
   on provider failure today — a 429 mid-turn stops the task.
7. **Cross-tab file collision warning.** 32 agent tabs per window; agents warn
   each other before editing the same file. Our daemon owns every runtime and
   is the natural referee for the same guard.
8. **Councils and side agents.** Two to four agents with different briefs
   debate one question to a verdict; plus a "duck" (think out loud) and an
   "advisor" (second opinion) that are deliberately not the coding agent.
   Cheap on our multi-provider daemon: fan one prompt to N providers, show
   verdicts side by side.
9. **Routines.** `/schedule` — a nightly review, an hourly check; runs while
   the app is open, stoppable mid-run. We have background work *within* a turn
   but no scheduled triggers. Daemon-side schedule per session.
10. **Reviewer as a CI gate.** A separate clean-context agent reads the diff
    and gives one verdict, usable to fail a pipeline. Pairs with headless.
11. **Headless mode.** Pipe a prompt in, get text, JSON or live events out,
    exit non-zero on a review verdict. Reuses the daemon directly; unlocks CI
    and scripting. We are GUI-only today.

### Medium

12. **Cost tracking with live subscription meters.** Per-session, per-model,
    per-helper cost as you work, plus plan-quota meters. Users think in
    dollars; we show tokens.
13. **Conversation checkpoints surfaced.** Theirs is a one-click step-back to
    any earlier turn. Ours exists (rewind/fork) but lives in the task menu.
14. **Setup wizard.** Guided first run: provider detection → auth → a test
    prompt. Our onboarding is a README.
15. **Glossary as trust copy.** Their benchmark page explains "a run", "a
    step", "billed vs reported" in plain words before showing numbers. The
    pattern, not the content, is the steal.
16. **Voice input, three tiers.** Transcription on a plan you already pay for,
    live with an OpenAI key, or offline via whisper.cpp. The mobile app is the
    natural home — push already exists there.
17. **i18n with RTL mirror.** Five languages, mirrored Arabic layout. Our
    `tr!()` plumbing exists; layout mirroring is the work.
18. **Mascot and a consistent metaphor.** One named character, and docs
    organized as a creature (nervous system, hands, immune system…). Ours has
    flavor words in the working spinner — the metaphor is the missing half.
19. **Live-reload user theme.** A JSON theme file that reloads as it is edited.
20. **Presets.** Shareable settings bundles by name, file or URL, so setups
    match across machines and teams.
21. **Compat readers.** Beyond AGENTS.md: read CLAUDE.md, Cursor rules, Claude
    Code hooks and agent definitions unchanged.
22. **Marionette (experimental).** A cheap model pre-locates the files and
    lines a request is about before the strong model reads anything. Pairs
    with the task router.
23. **Persistent Python kernel.** An interpreter that keeps state between
    steps, daemon-side. Niche, cheap.

### Infra and process

24. **Curl installers.** `curl -fsSL https://…/install.sh | bash` and the
    PowerShell twin, hash-pinned, next to the GUI download.
25. **git-cliff changelogs** (`cliff.toml` in-repo). Conventional commits →
    changelog draft; we hand-write, which is fine, but a draft saves time.
26. **Separate telemetry worker.** Opt-in analytics in its own auditable
    component, not baked into the app.
27. **Repo trust furniture.** SECURITY.md, PRIVACY.md (the daemon-with-token
    story especially deserves one), GOVERNANCE.md, BACKERS.md,
    THIRD_PARTY_LICENSES.md.
28. **Docs site in-repo** (Mintlify, `mintlify-docs/`). Docs versioned with
    the code they describe.
29. **Distribution plumbing.** Discord/X badges, a sponsors block, and
    pre-filled share intents (X/LinkedIn/HN/Reddit) at the end of every docs
    page.
30. **Publishing losses.** Their benchmark page counts the run where Claude
    Code beat them by 8 seconds, and says so. Publishing your losses is what
    makes the wins believable.
31. **Versioned add-on compatibility.** "Needs 3.7.2+; stays off and says why"
    — the degradations are graceful and self-explaining. Steal for any future
    plugin system.
32. **Open-core split as a product boundary.** Public repo holds the previous
    core; current development private. Relevant only if we ever productize.

## Top five, if we only take five

1. Morphs — the extension surface is our biggest structural gap.
2. Edit-then-check loop — the biggest quality-per-dollar win, and our daemon
   is already positioned to run it.
3. Verified benchmarks with the bill audit — a marketing moat that is cheap
   to build and hard to copy without being honest.
4. Task router + model fallback chains — resilience and cost in one move.
5. Headless + reviewer CI gate — a new surface that reuses everything.

## License note

The public repository carries the SoulForge v2 license and explicitly does
*not* contain Empryo v3's source; the current app is distributed under a
custom commercial license. Everything above is taken from public product
descriptions and is concept-level — nothing here requires or suggests copying
their proprietary code.
