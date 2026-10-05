# Plan: Durable command queue (offline prompts execute when the daemon can)

## Goal

A prompt submitted from any client while the daemon (or its provider runtime)
is unavailable must survive — daemon restarts, client disconnects, provider
binary restarts — and execute the moment the session can run it, without the
submitting client being connected. Today the queue lives in the session
snapshot and is drained by whichever client happens to be connected and
watching; that is the exact gap the Zeron comparison identified.

## Current context / assumptions (verified in code)

- Queued prompts are already durable *data*: `QueuedMessage` is part of
  `AgentSession.queued_messages`, persisted through `SaveTaskState`
  (`crates/waku-protocol/src/model.rs:793`).
- Draining is **client-side, opportunistic**:
  - Desktop: `Waku::drain_queued_message` (`src/app/runtime.rs:3334`) fires on
    turn settle and on connection events, but only while the desktop is
    running and connected.
  - Mobile: `drainQueue` (`apps/mobile/src/lib/runtime-context.tsx:311`) runs
    after `persistOrdered` on settle — same limitation.
  - Web: no drain at all.
- If the client that queued disconnects before settle, **nothing drains**.
  If the daemon restarts, the runtime map is empty (in-memory,
  `crates/waku-core/src/daemon.rs:46`), and the queue waits for a client.
- The daemon already has the right primitive: `Command::Prompt` on a session
  with no runtime spawns one (`daemon.rs` `command =>` fallback path +
  `sendPrompt` client behavior for the mobile case).
- Each connected client subscribes to `SequencedEvent`s; the hub replays a
  bounded journal per (session, runtime).

**Assumption**: the daemon (not any client) must own draining. It is the only
always-correct component: it sees settles, it persists state, it can start
runtimes.

## Proposed approach

Move the *drain decision* into the daemon. Clients keep writing
`QueuedMessage`s exactly as today (no wire change). The daemon watches for
"session idle + has queued messages + no runtime" and executes the head of
the queue itself, reusing the same `Prompt` path a client would have taken.

Key properties:
1. **Idempotent**: the daemon marks the dequeued message as "claimed" before
   spawning, so a concurrent client drain cannot double-send.
2. **Client-agnostic**: a client that is offline when the turn settles still
   gets its queued message sent.
3. **Backwards compatible**: clients that already drain (desktop, mobile)
   must not race the daemon. This is handled with a single new wire field.

## Step-by-step plan

### Step 1 — Protocol: `DrainedBy` discriminator on `turnStarted`-adjacent events

**Files**: `crates/waku-protocol/src/protocol.rs`, regenerate TS
(`bun run protocol:generate`).

Add to `WireDriverStartOptions` (or a new field on the `Prompt` command):

```rust
pub enum Command {
    Prompt {
        prompt: String,
        turn_id: Option<Uuid>,
        message_id: Option<Uuid>,
        /// Set by the daemon when it drains a queued message itself. Clients
        /// that see `drained_by_daemon: true` skip their own drain for this
        /// session (the daemon already did it).
        #[serde(default)]
        drained_by_daemon: bool,
    },
    // ...
}
```

Actually — simpler and less invasive: **the daemon does not send `Prompt` at
all**. It calls the same internal path `Start`+`Prompt` uses
(`handle_driver_command` on the driver handle). No protocol change needed for
the drain itself. The only protocol change is a *settlement notice*:

- New `SequencedEvent` kind is NOT needed either — `turnStarted` /
  `promptSubmitted` already broadcast to all subscribers, so every client
  sees the drain as ordinary activity.

**Revised Step 1**: no protocol change for the happy path. Only coordination
between daemon and clients matters (Step 3).

### Step 2 — Daemon: drain orchestration

**Files**: `crates/waku-core/src/daemon.rs`

1. In `handle_driver_command`'s `Command::Prompt` path and in the event sink
   that processes `DriverEvent::TurnFinished`, after persisting the settled
   state, check:

```rust
fn maybe_drain_queued(&self, session_id: Uuid) {
    let sessions = self.sessions.lock();
    // Busy, no runtime, or already spawning => nothing to do.
    let Some((runtime_id, driver)) = sessions.get(&session_id) else { return; };
    // Task state (persisted) holds queued_messages; the daemon's in-memory
    // task_state already mirrors it (see SaveTaskState merge).
    let mut state = self.task_state.lock();
    let Some(session) = state.sessions.iter_mut().find(|s| s.id == session_id) else { return };
    if session.status != SessionStatus::Idle { return; }
    let Some(next) = session.queued_messages.first().cloned() else { return };
    session.queued_messages.remove(0);
    drop(state);
    self.task_store.save(&mut self.task_state.lock()).ok();
    // Reuse the exact path `Command::Prompt` takes for a session WITH a
    // runtime: mint turn/message ids if the client did not, publish
    // PromptSubmitted, call driver.prompt(...).
    // (Extract the body of the `Command::Prompt` arm into
    // `fn submit_prompt(&self, session_id, prompt, turn_id, message_id)` and
    // call it from both places — DRY, single point of id minting.)
    self.submit_prompt(session_id, next.content, next.display_content, next.attachments);
}
```

2. Call `maybe_drain_queued` from:
   - `TurnFinished` handling in the event pump (where the runtime settles),
   - `Command::AttachSession` (a runtime may have just appeared because a
     client opened the session — the daemon can now drain),
   - daemon startup reconciliation (session restored with queued messages
     and a runtime that can be reattached? — **no**: runtime is gone after
     restart; drain only happens when a client attaches and starts one, or
     when `Start` completes for any reason).

3. **Claiming**: `maybe_drain_queued` holds `task_state` lock while removing
   the head and saving, so two daemon threads cannot double-drain. A
   *client* drain racing the daemon is the remaining race → Step 3.

### Step 3 — Client coordination: the daemon wins

**Files**: `src/app/runtime.rs`, `apps/mobile/src/lib/runtime-context.tsx`,
`apps/web/src/lib/runtime-context.tsx` (web gains drain behavior it never
had — with the daemon draining, web needs **no** drain code at all).

Simplest correct rule: **clients stop draining entirely.** The daemon drains.

- Desktop `drain_queued_message` → delete the body, keep the function as a
  no-op? No — delete it and all call sites; the daemon's `TurnFinished`
  broadcast triggers `taskStateChanged` (already sent) and the runtime's own
  `promptSubmitted` event, which the desktop already renders as a new turn.
- Mobile `drainQueue` → same removal.
- Client-side "Send now" (`steerQueuedMessage`) is a *user action* and stays
  — it drains immediately via `steerPrompt`, which is fine (the daemon's
  check happens on settle; an explicit user action racing it just means one
  path wins and the daemon finds an empty queue — safe because both
  `steerQueuedMessage` and `maybe_drain_queued` remove under a lock before
  sending, and the daemon re-checks emptiness).

**Residual risk**: a client that removed the head locally (optimistic UI)
while the daemon also removed it → double send. Mitigation: the daemon is
the only writer of `queued_messages` going forward. Clients that dequeue
today do so by *persisting a whole-session snapshot* (`persistSession`) —
the daemon's `session_projection_precedes` merge (cursor + `updated_at`)
already rejects stale snapshots, and the daemon's own save (after its own
dequeue) is newer. So a stale client dequeue loses the merge and the queue
reconciles to the daemon's truth. Verify with a test (Step 5).

### Step 4 — Persist the queue intent across daemon restart

`queued_messages` already persist. The one gap: after a daemon restart the
runtime is gone, so the daemon cannot drain until a client attaches. That is
acceptable and correct (a provider session cannot run without a runtime).
Document in the ADR: **the queue drains at settle-time and attach-time, not
boot-time.**

### Step 5 — Tests

**Files**: `crates/waku-core/src/daemon.rs` (`mod tests`), plus existing
test harness in `server.rs`.

1. `queued_message_drains_after_turn_finishes` — start a session with the
   mock driver, enqueue via `SaveTaskState`, complete the turn, assert the
   mock received the queued prompt and the queue is empty in persisted state.
2. `daemon_drain_survives_client_disconnect` — same, but drop the client
   subscriber before settle; the daemon still drains (assert on mock + state).
3. `stale_client_dequeue_loses_to_daemon_drain` — client saves a snapshot
   with the queue removed while the daemon drains concurrently; final
   persisted state has the prompt executed exactly once.
4. Existing tests that rely on client-side drain (`waku-core` merge tests,
   desktop `app::tests` covering `drain_queued_message`) get updated or
   deleted with the client-side path.

**Mobile unit tests** (`apps/mobile/src/lib/*.test.ts`): delete
`drainQueue`-specific tests if any exist; add one asserting the mobile no
longer dequeues on settle (it just observes).

### Step 6 — Wire visibility (optional, cheap)

While draining, the daemon broadcasts `promptSubmitted` — every client
already renders that. Optionally add a `queued → running` toast on mobile by
listening for the `promptSubmitted` event on a session whose queue the client
knows held messages. Skip for v1.

## Files likely to change

| File | Change |
| --- | --- |
| `crates/waku-core/src/daemon.rs` | `maybe_drain_queued`, extract `submit_prompt`, hook settle + attach |
| `crates/waku-core/src/daemon.rs` (`mod tests`) | 3 new tests |
| `src/app/runtime.rs` | delete `drain_queued_message` + call sites |
| `apps/mobile/src/lib/runtime-context.tsx` | delete `drainQueue` + call site |
| `crates/waku-protocol/src/protocol.rs` | **no change** (expected) |
| `docs/adr/0003-daemon-owned-command-queue.md` | new ADR |
| `CHANGELOG.md` | 0.1.49 entry |

## Validation

- `cargo test -p waku-core --lib` — new tests green, no regressions
- `cargo test -p waku --lib` — desktop tests updated, green
- `cd apps/mobile && bun test` — queue tests removed/updated, green
- `bun run protocol:check` — confirms "no protocol change" claim
- Manual: run desktop + phone against one daemon; queue from the phone;
  kill the phone's connection (airplane mode); finish the turn from the
  desktop; **the queued prompt runs anyway** — the exact behavior that is
  broken today.

## Risks, tradeoffs, open questions

1. **Risk — double drain during rollout.** If the desktop runs an older
   build (still drains) against a newer daemon (also drains), the daemon's
   lock-protected dequeue + cursor-merge favors the daemon, but a prompt
   could theoretically execute twice if both pass their emptiness check
   before either saves. *Mitigation*: both paths go through
   `submit_prompt`, and the turn id is derived from the queue entry's id
   (`QueuedMessage.id` as turn/message id seed), so the daemon's dedupe
   (same turn id → same turn) collapses the second send. **Decide**: seed
   turn ids from queue ids, or accept the tiny race. Recommendation: seed
   from queue ids — deterministic and free.
2. **Risk — daemon drains while a user is typing a replacement.** The
   client-dequeue-and-edit flow (mobile "editingQueued") holds the message
   out of the queue locally. With the daemon draining, the daemon may send
   the head while the user edits it. *Mitigation*: the mobile edit flow
   already dequeues and persists before editing (existing behavior), so the
   daemon sees an empty head — no conflict. Verify with a scenario test.
3. **Open question — should `AttachSession` trigger a drain?** If a client
   attaches (opens the screen), the runtime exists; the daemon drains. But
   attaching from a phone *to look* at a task would suddenly *run* it. That
   is probably wrong. **Recommendation**: drain only on (a) turn settle
   while a runtime exists, and (b) an explicit client `Prompt`/`Start`. Do
   not drain on attach.
4. **Tradeoff — clients lose the optimistic dequeue.** Today the mobile
   client dequeues locally for instant UI. After this change the queue the
   client shows is the daemon's until the daemon's next broadcast. Acceptable:
   the transcript's own optimistic rows already work this way.
5. **YAGNI guard**: no priorities, no scheduling windows, no per-client
   queues. One FIFO per session, daemon-owned. Everything else is deferred
   until a real need shows up.

## ADR (write after plan approval, before implementation)

`docs/adr/0003-daemon-owned-command-queue.md` — decision: the daemon drains
queued prompts; clients observe. Hard to reverse (removes client-side drain
code), surprising later ("why doesn't the client drain?"), and a real
trade-off (client-side drain is simpler offline, daemon-side is correct
with clients absent).
