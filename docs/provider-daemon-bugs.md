# Provider / daemon bug notes — 2026-10-13

Status: **fixed** on `fix/provider-daemon-resilience` (PR pending). Each section below
records the root cause as found, the fix that landed, and the test that guards it.
Every claim is backed by a file:line citation or a reproduction run on this machine.

Scope: the four reports — OMP busy error, cross-client queueing, Codex thread-open
errors, OpenCode 2 spawn failure — plus the shared daemon/provider surface behind them.

---

## 0. Evidence base

| Where | What it proved |
| --- | --- |
| `%LOCALAPPDATA%\Waku\app.db` (`messages` table) | The literal error strings users saw, per session |
| `@oh-my-pi/pi-coding-agent@18.4.5/dist/cli.js` | OMP RPC surface: which verbs exist and which throw `AgentBusyError` |
| `omp --mode rpc` live handshake | The `ready` frame and command list OMP actually emits |
| `rustc` spawn probes (temp dir) | Which Windows shim forms `Command::spawn` can and cannot launch |
| `opencode.ai/v2/docs/api` + live `opencode serve` on :7811 | OpenCode v2 REST surface differs from v1 |

Exact strings recovered from the database:

```
67d7211b… openCode  Could not start the agent: failed to start `opencode serve`: The system cannot find the file specified. (os error 2)
a4a5803e… codex     thread 01a11f29-5c50-7e60-9948-7e3b74aa082c already has an active writer
babf0d6d… ohMyPi    Agent is already processing. Use steer() or followUp() to queue messages, or wait for completion.
d7c2f401… codex     Codex did not finish opening its thread
```
---

## 1. OMP: "Agent is already processing"

**Symptom.** Mid-turn, the message is rejected instead of being steered or queued:

> Agent is already processing. Use steer() or followUp() to queue messages, or wait for completion.

Reproduced three times in one session (`babf0d6d…`), each time after a user message
sent while the agent was working.

**Root cause.** The string is OMP's own `AgentBusyError`, thrown on the `prompt`
verb specifically:

- `AgentBusyError` is defined with exactly that message in `dist/cli.js`
  (`class Sd extends Error{constructor(e="Agent is already processing…")}`).
- RPC dispatch has **separate verbs**, and only `prompt` refuses a busy agent:

  | RPC verb | Handler | Behaviour while streaming |
  | --- | --- | --- |
  | `prompt` | `e.prompt(msg, {streamingBehavior})` | **throws `AgentBusyError` when `streamingBehavior` is absent** |
  | `steer` | `e.steer(msg, images)` | always accepted |
  | `follow_up` | `e.followUp(msg, images)` | always accepted |
  | `abort_and_prompt` | abort, then prompt | always accepted |
  | `remove_queued_message` | `{message, queue}` | removes from `steering` / `followUp` |

  The guard is explicit: `if(this.isStreaming){let S=t?.streamingBehavior;if(!S)throw new Sd; …}`.

- Waku's Pi/OMP driver sends only two of those verbs — `{"type":"prompt",…}` and
  `{"type":"steer",…}` (`crates/waku-core/src/driver/pi.rs:874` and `:531`).
  There is **no `follow_up`, no `streamingBehavior`, and no `abort_and_prompt`
  anywhere in the Rust tree** (grep for those names returns only unrelated hits).

So whenever a plain `Prompt` command reaches OMP while a turn is live, OMP refuses
it, and Waku never falls back to `follow_up`.

**Why the queue does not save it.** `session_can_steer` requires
`turn.status == Running && turn.provider_turn_started`
(`src/app/runtime.rs:147-153`). When that gate is false but the session still reads
busy, the app correctly calls `enqueue_follow_up_submission`. The failure is the
window where the session **is** busy and steerable by Waku's bookkeeping, but the
prompt path is taken instead of the steer path. The daemon's own queue drain calls
`driver.prompt(...)` directly (`crates/waku-core/src/daemon.rs:2272`), bypassing the
steer branch entirely — that is the reproduction.

**Fix (landed).**
1. `crates/waku-core/src/driver/pi.rs`: the writer picks the verb from a shared
   run-live flag — `follow_up` mid-turn, `prompt` otherwise — via the new
   `PiFlavor::queues_a_live_prompt` capability.
2. A prompt refused anyway is handed back to the writer as `CommandMessage::ReplayPrompt`
   and replayed as `follow_up`; only the writer owns stdin, so the reader cannot retry
   it directly. Pi keeps the plain verb — it accepts a mid-run prompt.
3. `PendingResponse::Prompt` now carries the verb and message so the refusal is
   attributable.

**Test.** `ohmypi_busy_refusal_is_replayed_as_a_follow_up` and
`pi_prompt_failures_are_not_replayed`.
---

## 2. Cross-client queueing (desktop + mobile + web)

**Symptom.** A follow-up queued on one client is not visible/queueable on another;
queueing from both does not produce two entries.

**Root cause A — the queue is part of the whole session, and a non-stale save
replaces the session wholesale.**

`Command::SaveTaskState` merges each incoming session
(`crates/waku-core/src/daemon.rs:450-500`):

```rust
if session_projection_precedes(existing, &session, active_runtime) {
    merge_stale_session_metadata(existing, session);   // union-by-id, keeps queue
} else {
    adopt_client_projection(existing, session);        // *existing = incoming
}
```

`adopt_client_projection` is a full replace (`crates/waku-core/src/daemon.rs:1158-1164`).
Only the *stale* branch unions queued messages by id
(`merge_stale_session_metadata`, `:1140-1148`). So when two clients each add an
entry and both saves look current, the second save **discards** the first client's
entry. Last writer wins.

**Root cause B — staleness is decided at one-second resolution.**

`session_projection_precedes` falls back to `incoming.updated_at < existing.updated_at`
(`crates/waku-core/src/daemon.rs:1121`), and `updated_at` is `unix_time()` — whole
seconds (`crates/waku-protocol/src/model.rs:3711-3716`). Two clients saving inside
the same second are indistinguishable, so which one "wins" is arbitrary.

**Root cause C — the drain waits on a client-owned field.**

`drain_queued_prompt` polls for the session to stop being busy for up to
`DRAIN_BUSY_WAIT = 5s` (`crates/waku-core/src/daemon.rs:2208-2228`), because
`session.status` is a *client* projection that flips to Idle only on the settling
client's next save. If that client is gone or slow, the drain silently gives up and
the follow-up waits for the next settle — which may never come. This is the ADR-0003
gap re-entering through the status field.

**Root cause D — Stop does not suppress the drain.**

`suppressed` is snapshotted **when the driver starts**
(`crates/waku-core/src/daemon.rs:969`), captured into the event thread, and reused
for every `TurnFinished` (`:1012-1017`). `Command::Cancel` mutates the live
`drain_suppressed` set (`:282-284`), but the closure never re-reads it. A Stop
pressed mid-turn therefore does **not** stop the queued follow-up from running.

**Fix (landed).**
- `adopt_client_projection` now merges the queue additively and order-preserving
  (`merge_queued_messages`), which removes root causes A and B together: a second
  client's save can no longer erase the first's entry, and the one-second
  `updated_at` resolution stops mattering for the queue.
- Removal became its own `RemoveQueuedMessage` command — the same shape task removal
  already used — because a save that omits an entry cannot express a removal without
  erasing it for everyone. Desktop, web and mobile all route remove/edit/steer
  through it.
- `drain_suppressed` is an `Arc<Mutex<..>>` re-read at settle time, so a Stop pressed
  mid-turn now suppresses the settle it was meant to (root cause D).
- Root cause C (the drain waiting on a client-written `status`) is unchanged; it is
  part of the daemon-owned session-state work in section 5.

**Tests.** `concurrent_queues_from_two_clients_both_survive` and
`a_save_omitting_a_queued_entry_does_not_remove_it`.
---

## 3. Codex: "already has an active writer" / "did not finish opening its thread"

**Symptom.** Two distinct strings, both from the same handshake:

- `thread <id> already has an active writer` — surfaced verbatim as an assistant message.
- `Codex did not finish opening its thread` — surfaced as an assistant message.

**Root cause A — the retry budget is shorter than Codex's own shutdown.**

`THREAD_OPEN_RETRIES = 4` with a 250 ms sleep between attempts
(`crates/waku-core/src/driver/codex.rs:1218`, `:424-430`) gives ~1.25 s total. The
comment claims "Codex's own EOF shutdown, which the fork fixture times at 100ms",
but the observed failure means the previous app-server had not released the thread
within that window. After 4 retries the error goes straight to the UI (`:1886-1892`).

**Root cause B — the reopen is queued behind the prompt that needs it.**

`ReopenThread` is sent on the same `commands` channel the writer drains
(`crates/waku-core/src/driver/codex.rs:1889`). The writer handles `Prompt` by calling
`wait_for_thread_id`, which blocks up to **10 s** (500 × 20 ms, `:1430-1438`). If a
prompt was already queued when the reader decided to reopen, the writer burns the
full 10 s waiting on a thread that will never open, emits
`errors.codex_thread_open_incomplete`, and only *then* processes `ReopenThread`. The
recovery is structurally guaranteed to arrive too late.

**Fix (landed).** The reader signals through a shared `ThreadOpenState` flag, and
`wait_for_thread_id` replays the open *inside its own wait* — a queued command could
never be reached by the thread that was blocked reading. The retry budget widened to
8 attempts inside a 20 s handshake budget, with the replay scheduled one flush-delay
out. `CommandMessage::ReopenThread` is gone.

**Test.** `a_rejected_open_is_replayed_while_the_writer_waits`.
---

## 4. OpenCode 2: "failed to start `opencode serve`: … (os error 2)"

**Symptom.** Starting an OpenCode task fails immediately with
``Could not start the agent: failed to start `opencode serve`: The system cannot
find the file specified. (os error 2)`` (`67d7211b…`, failed 2 s after creation).

**Root cause A — `opencode` and `opencode2` now resolve to the same v2 binary.**

On this machine both shims run OpenCode **v2.0.27**:

```
opencode  -> C:\nvm4w\nodejs\opencode.cmd  -> opencode v2.0.27
opencode2 -> C:\nvm4w\nodejs\opencode2.cmd -> opencode v2.0.27
```

The user upgraded OpenCode to v2, and the v1 npm shim was replaced in place.
`ProviderKind::OpenCode` still resolves the bare name `opencode`
(`crates/waku-protocol/src/model.rs:118`), so the **v1 driver now launches a v2
binary** whose HTTP surface it cannot speak.

**Root cause B — OpenCode v2's REST API is not v1's.**

Verified against a live `opencode serve --hostname 127.0.0.1 --port 7811`:

| Route | v1 driver expects (`opencode_session.rs`, `driver/opencode.rs`) | v2 actually serves |
| --- | --- | --- |
| `/global/health` | JSON health | **200 + HTML** (web UI shell) |
| `/session` | JSON session list | **200 + HTML** |
| `/agent` | JSON agent list | **200 + HTML** |
| `/api/health` | — | **401** (Basic auth required) |

`crates/waku-core/src/opencode_session.rs:366-380` polls `/global/health` and accepts
any success, so startup *appears* to succeed; the first real JSON call then fails.
The v2 docs list `GET /api/session`, `GET /api/event`, `GET /api/model` — the same
shape `opencode2_session.rs` already implements.

**Root cause C — the shim forms Rust cannot launch.** Confirmed by spawn probes:

| Form | Result |
| --- | --- |
| `opencode.cmd` (absolute) | launches |
| extensionless `opencode` (POSIX shim) | `os error 193`, not a valid Win32 application |
| `opencode.ps1` | `os error 193` |
| bare `opencode` | `program not found` |
| absolute `.exe` in an existing dir but file missing | **`os error 2`** |
| absolute path whose parent dir is missing | `os error 3` |

So `os error 2` means *the resolved path pointed at a file that no longer exists* —
consistent with the in-flight npm upgrade at 14:50 rewriting the shim while the
14:55 task tried to launch it. The durable defect is B, not C: even a healthy launch
targets the wrong API.

**Root cause D — the fork ships a second, stale OpenCode.** A global npm shim still
exists at `%APPDATA%\npm\opencode.cmd` (package `opencode-ai@0.5.12`) pointing at
`…\@openchamberelectron\resources\opencode-cli\opencode.exe` (v0.x era). It is
shadowed by the nvm4w shim today, but the resolution order
(`crates/waku-core/src/command_env.rs`) is PATH-dependent and can pick it up.

**Fix (landed).** `OpenCodeServer::start` now probes health through
`accept_health_body`, which requires a JSON body and otherwise fails with a message
naming the resolved binary and the likely cause (an OpenCode 2 upgrade). The server
keeps its resolved `binary` path so the error can name it.

Deliberately *not* done here: silently routing a v2 binary to the OpenCode 2 driver.
Which provider a task was created as is the user's choice, and a silent redirect
would hide the upgrade rather than explain it. The error tells them what to change.

**Test.** `a_non_json_health_body_is_rejected_as_a_version_mismatch`.
---

## 5. Cross-cutting: the provider/daemon control surface is duplicated

The four reports share one structural cause: **each transport re-implements the same
three verbs — prompt, steer, stop — with different semantics, and the daemon does not
own the result.**

Concrete duplication, all verified:

| Concern | Where it is decided | Divergence |
| --- | --- | --- |
| Can this provider steer? | `DriverControl::supports_steer` per driver | hardcoded `true` in Pi/Amp/Claude/Codex/DeepSeek/OpenCode/OpenCode2; `false` default; ACP reads a field |
| How is a mid-turn message delivered? | each writer thread | Codex `turn/steer`; OMP `steer` verb; ACP second `session/prompt`; OpenCode `prompt_async`; Amp stdin |
| What does Stop mean? | `DriverControl::cancel` | protocol interrupt for most; **kills the process** for Amp (`driver/amp.rs:360-364`); `turn/interrupt` for Codex |
| Where does the follow-up queue live? | client `AgentSession.queued_messages` | drained by the daemon (ADR 0003), but the *status* it waits on is client-written |
| Who suppresses the drain after Stop? | `drain_suppressed` set | read once at driver start (`daemon.rs:969`), never re-read |

**Recommended shape (not implemented).** Introduce one daemon-owned session state
machine — `Idle | Starting | Running | Stopping | Failed` — written only by the daemon
from driver events, and make every client-facing decision (`can steer`, `queue vs
send`, `drain now`) read that single state instead of inferring it from
`AgentSession.status` plus a per-driver capability flag. That removes root causes
2A–2D at once and gives every provider the same three verbs.

This is the "big thing" the report calls for. It is a refactor of
`crates/waku-core/src/daemon.rs` + `driver/mod.rs`, not a patch.

---

## 6. What landed, and what is still open

Landed on `fix/provider-daemon-resilience`:

1. **Codex thread open** — the reopen happens inside the writer's wait.
2. **OMP busy** — a mid-turn prompt is delivered as `follow_up`.
3. **OpenCode 2** — a version mismatch fails loudly and names the binary.
4. **Queue ownership** — the queue is merge-only, removal is its own command, and a
   mid-turn Stop suppresses the drain.
5. **Recovery UX** — a settled failed session offers Reload and Try again on desktop,
   web and mobile.

Still open (the ADR-level half of section 5):

- Root cause 2C: the drain still infers "provider idle" from the client-written
  `session.status`. The daemon-owned session state machine
  (`Idle | Starting | Running | Stopping | Failed`, written only from driver events)
  is the structural fix and deserves its own ADR before code.
- `supports_steer` remains a per-driver constant rather than a capability the daemon
  owns; folding it into that same state machine is the follow-up.
