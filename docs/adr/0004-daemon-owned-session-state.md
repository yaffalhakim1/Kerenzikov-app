# ADR 0004: The daemon owns live session state; clients render it

- **Status:** Accepted (steps 1–2 landed; 3–4 open)
- **Date:** 2026-10-14
- **Deciders:** yaffalhakim1

## Context

Two questions are asked on every turn, and both are currently answered from
data no single component owns:

1. **Is the provider idle?** Asked by the daemon's queue drain before it
   starts a queued follow-up.
2. **Can this session be steered right now?** Asked by the desktop, web and
   mobile clients to decide whether Enter steers into the running turn or
   queues a follow-up.

### Where the answers come from today

`AgentSession.status` is the field both questions read
([model.rs](../../crates/waku-protocol/src/model.rs)):

```rust
pub enum SessionStatus { Idle, Connecting, Working, Waiting, Background, Failed }
```

It is written almost entirely by **clients**:

| Writer | Sites |
| --- | --- |
| Desktop (`src/app/streaming.rs`, `runtime.rs`, `sessions.rs`) | ~18 |
| Web and mobile runtimes | comparable |
| **Daemon** | **1** — rewind only (`daemon.rs:1463`) |

The daemon never learns the provider went idle; it reads what a client last
saved.

The second answer adds a per-driver constant on top
(`crates/waku-core/src/driver/*.rs`):

```rust
fn supports_steer(&self) -> bool { true }   // codex, pi, amp, claude, …
```

That answers "can this provider *ever* steer?", a static fact. The desktop
combines it with two client-written signals to approximate "right now":

```rust
// src/app/runtime.rs:147
pub(super) fn session_has_active_provider_turn(session: &AgentSession) -> bool {
    session.is_busy()                                   // client-written status
        && session.turns.last().is_some_and(|turn| {
            turn.status == TurnStatus::Running
                && turn.provider_turn_started           // client-written transcript
        })
}
```

### Why this fails

**The drain waits on a client.** `drain_queued_prompt`
(`crates/waku-core/src/daemon.rs:2249`) polls `session.status.is_busy()` for
`DRAIN_BUSY_WAIT` (5s) before giving up:

```rust
// daemon.rs:2260 — the code's own comment
// The session's status is a client projection: the settling client flips
// it to Idle on its next save, which can trail the TurnFinished this
// request rode in on by a save interval.
```

Two concrete failures follow:

- **The settling client disappears.** It disconnects before saving `Idle`, so
  the status stays `Working`. The drain polls for five seconds, gives up, and
  the queued follow-up is stranded even though the daemon and provider are
  both alive and idle. The poll is a band-aid over not owning the answer.
- **A client is optimistic.** It writes `Idle` while the provider is still
  streaming, so the drain prompts into a live turn. This is the mechanism
  behind the Oh My Pi `AgentBusyError` (`docs/provider-daemon-bugs.md` §1): the
  drain trusted a stale client opinion about the provider.

**The steer gate is a guess.** `supports_steer()` returned `true` for Oh My Pi
while Oh My Pi *refuses* a plain prompt mid-turn. The static flag cannot be
wrong about the provider type and still be wrong in practice, because the
question was never about the type — it was about this moment.

### The daemon already knows

The daemon's per-session event thread
(`crates/waku-core/src/daemon.rs:1006`) receives every event that determines
liveness:

| Driver event | Means |
| --- | --- |
| `TurnStarted` | the provider is running |
| `TurnParked` | the reply ended, detached work still holds the turn |
| `TurnFinished { success }` | the turn is over |
| `ProcessExited` | the runtime is gone |
| `Connected` | the runtime is ready |
| `Command::Cancel` | the user asked to stop |

The information is already in the daemon's hands; it is thrown away in favour
of a client's echo of it.

## Decision

**The daemon owns a per-session liveness state, derived from driver events,
and clients render it.**

```rust
/// Written only by the daemon, from the session's own driver events.
pub enum LiveState {
    /// No runtime, or a runtime that is not running a turn.
    Idle,
    /// A runtime is being created or attached.
    Starting,
    /// A provider turn is running.
    Running,
    /// The reply ended but detached work holds the turn open (the current
    /// `Background`), or the user pressed Stop and the interrupt is in flight.
    Parked,
    /// The runtime exited or failed to start.
    Failed,
}
```

`AgentSession.status` is replaced by this value as a **daemon-owned** field,
in the same class as `archived_at` and the ending checkpoints that
`adopt_client_projection` already refuses to take from a client
(`crates/waku-core/src/daemon.rs:1186`).

Two questions then have one trustworthy answer each:

- **Drain?** — the daemon reads its own state. No polling, no client, no
  `DRAIN_BUSY_WAIT`.
- **Steer?** — `state == Running && driver.supports_steer()`. "Right now" comes
  from the daemon's state; "can this provider" stays on the driver. Both are
  facts, not guesses.

`supports_steer()` stays where it is. It is a real per-transport capability
(the ACP and OpenCode2 drivers already compute it rather than hardcoding it);
what changes is that it is no longer asked to answer a question about time.

### State derivation

| Event | New state |
| --- | --- |
| `Command::Start` accepted | `Starting` |
| `Connected` | `Idle` (runtime ready, no turn) |
| `TurnStarted` | `Running` |
| `TurnParked` | `Parked` |
| `TurnFinished` | `Idle` |
| `Command::Cancel` | `Parked` (interrupt in flight) |
| `ProcessExited`, start failure | `Failed` |

Transitions are monotonic per runtime and carry the `runtime_id`, so a late
event from a superseded runtime cannot move a newer one's state.

## Consequences

### Positive

- The queue drain stops guessing. A queued follow-up runs the moment the
  daemon observes the settle, with the client gone, and cannot be fired into a
  live turn by a stale save.
- "Can I steer now?" becomes one predicate over facts. The class of bug where
  a provider advertises steering and then refuses the message disappears,
  because the question is no longer asked of a static flag.
- Clients get simpler: they stop maintaining a status they cannot compute
  (only the daemon sees the driver's events) and just render what arrives.
- Web and mobile gain correct busy/steer behaviour for free, the same way ADR
  0003 gave them the queue drain.

### Negative

- **Clients lose the optimistic status.** Today the desktop paints "Working"
  the instant Enter is pressed, before the provider confirms. With a
  daemon-owned state the UI shows the daemon's value, which trails the
  keypress by a round trip on a remote daemon. This is the real cost of the
  decision, and the mitigation is narrow: the *submitting* client may keep a
  local "pending submission" flag for its own spinner, exactly as it already
  keeps `submission_preparations` today. That flag is presentation, not shared
  state, and never reaches another client.
- A wire change: `status` becomes daemon-owned, so all three clients must
  stop writing it in the same release. A client that keeps writing it would
  have its value overwritten by the daemon rather than honoured, which is the
  intended failure mode but must be a deliberate rollout.

### Neutral

- `SessionStatus`'s four busy variants collapse into `Running`/`Parked`. The
  `Waiting` and `Connecting` distinctions survive as derived presentation
  (a permission or user-input prompt is pending; a runtime is starting), not
  as independent stored states.
- The drain no longer needs `DRAIN_BUSY_WAIT`/`DRAIN_BUSY_POLL`; the state is
  read once under the task-state lock, as the queue already is.
- `supports_steer` is unchanged in shape. This ADR does not move provider
  capability into the daemon — only liveness.

## Alternatives considered

1. **Keep `status` client-written and tighten the merge.** Rejected: the
   client cannot know the provider went idle, so no merge rule can make the
   value correct. Root cause, not symptom.
2. **Have the daemon publish a separate `live_state` field and leave `status`
   alone.** Adopted as the *staging* shape, not the destination: two
   overlapping sources of truth is exactly the situation being fixed, so
   shipping it permanently would trade one ambiguity for two. It is worth one
   release because it lets the daemon start publishing without a three-client
   change landing at once; `status` is deleted once every client reads the new
   field (see Rollout).
3. **Move `supports_steer` into the daemon too.** Deferred. It is a genuine
   per-transport capability that belongs with the driver; folding it in would
   grow this change without fixing anything the state machine does not.

## Rollout

1. ~~Add `LiveState` to the protocol and have the daemon derive it, publishing
   it alongside `status` (alternative 2) with no client changes.~~ **Landed.**
2. ~~Point the drain at `LiveState` and delete `DRAIN_BUSY_WAIT`. This is the
   step that fixes the stranded-follow-up bug on its own.~~ **Landed.**
3. Move the steer gate to `LiveState` on desktop, then web, then mobile.
4. Delete `SessionStatus` from the client write path.

Steps 1–2 were safe to ship alone and are worth doing even if 3–4 slip. Both
are in: the daemon derives and persists `LiveState` from driver events
(`live_state_for_event`, `set_live_state`), `adopt_client_projection` refuses
to take it from a client, and `drain_queued_prompt` reads it instead of
polling. `DRAIN_BUSY_WAIT`/`DRAIN_BUSY_POLL` are gone.

What steps 1–2 deliberately do **not** do: `status` is still written by
clients and still read by the UI. The two coexist, with `live_state` correct
and authoritative for the daemon's own decisions. Step 3 moves the steer gate
onto it; step 4 removes the old field.

## Follow-up

- `docs/provider-daemon-bugs.md` §5 records this as the structural fix for
  root causes 2C and the steer flag; update it when this lands.
- The permission/user-input "waiting" presentation currently rides on
  `SessionStatus::Waiting`; it needs an explicit home once that variant goes.
