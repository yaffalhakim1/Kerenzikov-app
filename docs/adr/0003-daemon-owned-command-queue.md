# ADR 0003: The daemon drains queued prompts; clients observe

- **Status:** Accepted
- **Date:** 2026-10-05
- **Deciders:** yaffalhakim1

## Context

A follow-up submitted while an agent is working becomes a `QueuedMessage`
on the session — durable, persisted, merged correctly across clients. But
*delivering* that message to the agent when the turn settles is performed
by whichever client happens to be connected: the desktop's
`drain_queued_message` and the mobile runtime's `drainQueue`.

That split means the queue is only as durable as the device that queued it:

- Queue from the phone, lose the phone's connection, and the follow-up
  never reaches the agent — the queue waits for the queuing client to
  return, even though the daemon and the agent are both alive and idle.
- The web client never drains at all.
- The desktop drains, but only while it runs.

The Zeron comparison (2026-10-05 session) identified the same gap and
solved it with a daemon-owned durable command queue.

## Decision

**The daemon drains.** When a session's turn settles and the daemon finds
a queued message on that session, the daemon dequeues it under the
task-state lock and submits it through the same code path an explicit
client `Prompt` uses. Clients no longer dequeue on settle; they observe
the drain through the ordinary `promptSubmitted`/`turnStarted` events they
already render.

Turn and message ids for a daemon-drained prompt are derived from the
`QueuedMessage.id`, so a stale client snapshot that still holds the
message cannot mint a second turn from the same queue entry.

## Consequences

### Positive

- A queued follow-up executes as long as the daemon and agent host are
  alive — the queuing client can disconnect immediately after sending.
- One drain implementation instead of two (and the web client gains the
  behavior it never had, for free).
- The drain races that existed between two clients disappear: the daemon
  is the single dequeue point, protected by the task-state lock.

### Negative

- Clients lose the optimistic dequeue: the queue a client shows updates
  when the daemon's state arrives, not at local dequeue time. The
  transcript's own optimistic rows already work this way, so the model is
  consistent.
- A client that dequeues locally (the mobile edit flow) persists that
  dequeue; if the daemon's cursor-merge accepts it, the daemon will not
  drain — correct, since the user is editing. If the client goes offline
  mid-edit, the message is parked in the client's draft, not the queue.
  This matches the edit flow's existing semantics.

### Neutral

- The daemon cannot drain after *its own* restart until a runtime exists
  again (a provider session cannot run without one). Drain triggers are:
  turn settle, and an explicit client `Prompt`. Attaching to a session
  (opening it on a phone) deliberately does **not** drain — opening a task
  to read it must not start its queued prompt.
- No priorities, no scheduling windows, no per-client queues. One FIFO
  per session, daemon-owned.
