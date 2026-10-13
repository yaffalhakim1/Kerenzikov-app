# Implementation plan — provider/daemon resilience + recovery UX

Branch: `fix/provider-daemon-resilience` (from `origin/main` @ 22e43e2)
Scope: the four bugs in `docs/provider-daemon-bugs.md`, plus a user-facing recovery affordance.

## Verdict

APPROVED WITH CHANGES. Three of the four are contained driver fixes. The fourth
(cross-client queueing) needs the daemon to own session state — that is the ADR-level
change, and it is included here because it is the root cause, not a band-aid.

## Decisions

1. **Codex thread-open** — fix ordering + widen the budget. `ReopenThread` must not
   queue behind a prompt that is itself blocked on the thread opening.
2. **OMP busy** — speak OMP's actual RPC. Use `follow_up` for a prompt that arrives
   mid-turn; keep `prompt` for a fresh turn.
3. **OpenCode** — detect v2 and route it to the existing OpenCode 2 driver instead of
   failing. Validate health returns JSON so a mismatch is diagnosable.
4. **Queue ownership** — make `queued_messages` daemon-owned like `archived_at`;
   re-read drain suppression at settle time.
5. **UX** — one recovery surface: a failed session offers **Reload** (drop the runtime
   and re-attach, preserving the transcript) and **Retry** (resubmit the last prompt).

## Order of work

Each step is independently testable and lands as its own commit.

### Step 1 — Codex thread-open ordering (`crates/waku-core/src/driver/codex.rs`)
- Widen `THREAD_OPEN_RETRIES` and back off (250ms → growing) so a slow prior writer is
  survivable.
- Make the reopen happen **before** a queued prompt consumes its 10s wait: drain
  `ReopenThread` with priority, or have `wait_for_thread_id` perform the reopen inline
  when its wait is about to expire.
- Only surface `codex_thread_open_incomplete` after a reopen has actually been attempted.
- Test: fixture that holds the thread locked past the old budget; assert reopen precedes
  prompt dispatch and the turn succeeds.

### Step 2 — OMP mid-turn delivery (`crates/waku-core/src/driver/pi.rs`)
- Add `follow_up` to the RPC vocabulary for the `OhMyPi` flavour.
- When `Prompt` arrives while a turn is live, send `follow_up` instead of `prompt`.
- Recognize OMP's `AgentBusyError` text and retry once as `follow_up` instead of
  surfacing it as an assistant error.
- Test: mid-turn prompt produces `follow_up` on the wire and settles once.

### Step 3 — OpenCode v2 routing (`crates/waku-core/src/opencode_session.rs`, `driver/mod.rs`)
- Health probe must require a JSON body; an HTML 200 is a version mismatch, not health.
- On mismatch, report a typed error naming the resolved binary path and the detected
  version, so the user sees "OpenCode 2 detected — this task uses the OpenCode 2 driver".
- Decide routing: v2 binary under `ProviderKind::OpenCode` routes to the OpenCode 2
  driver (reusing `opencode2_*`), or the session start refuses with an actionable message.
- Test: health probe rejects HTML 200; error names the binary path.

### Step 4 — Daemon-owned queue (`crates/waku-core/src/daemon.rs`)
- `queued_messages` becomes daemon-owned: a client save may add/remove entries but never
  replace the list wholesale (mirror `preserve_daemon_checkpoints`).
- Re-read `drain_suppressed` at settle time instead of capturing it at driver start.
- Tests: two clients queue concurrently → both survive; Stop mid-turn → no drain.

### Step 5 — Recovery UX (desktop, then mobile/web)
- `src/app/`: a failed session renders a **Reload** action that drops the runtime and
  re-attaches (transcript preserved), plus **Retry** which resubmits the last prompt.
- Wire the same action into the existing toast/banner surfaces.
- Mobile: surface the same two actions on a failed session banner.
- Locale strings for both.

### Step 6 — Docs
- Update `docs/provider-daemon-bugs.md` status per fix.
- ADR for daemon-owned session state if Step 4 changes the contract.

## Verification
- `cargo test -p waku-core --lib`
- `cargo test -p waku --lib`
- `cargo clippy --workspace --all-targets`
- `cd apps/mobile && bun test` for any mobile change
- The dev watcher rebuilds and relaunches the debug app; validate the recovery affordance
  against a real failure (stop the provider binary, then press Reload).

## Risks
1. **OpenCode routing** — silently redirecting v1→v2 could surprise; the error must name
   what happened. Mitigation: explicit message + a setting to pin the binary.
2. **Queue ownership** — clients that dequeue locally (mobile edit) must keep working.
   Mitigation: add/remove-by-id merge preserves that flow; test it.
3. **Reload semantics** — dropping a runtime mid-turn could orphan provider work.
   Mitigation: Reload is only offered on a settled/failed session, never while busy.
