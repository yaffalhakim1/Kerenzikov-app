# ADR 0002: Keep the runtime-event reducer in TypeScript (reject UniFFI for now)

- **Status:** Rejected (revisit if the conditions below change)
- **Date:** 2026-10-03
- **Deciders:** yaffalhakim1
- **Context:** `packages/waku-client` (TS) and `src/app` (Rust) both reduce the
  same `DriverEvent` stream.

## Context

The question was whether to move the shared domain logic into Rust behind
UniFFI, so desktop and mobile stop maintaining parallel implementations. That
only pays off if the logic is genuinely shared and genuinely duplicated. Both
halves of that assumption are wrong today.

### What actually exists

The wire contract is **already** single-sourced. `crates/waku-protocol` derives
`ts-rs` and `bun run protocol:generate` emits 100 files into
`packages/waku-client/src/generated`, gated in CI by `protocol:check`. There is
no type drift to eliminate; it was solved before this question came up.

The `DriverEvent` stream is reduced in two places, but they are not the same
program:

| | Rust (`src/app/streaming.rs`) | TS (`packages/waku-client/src/event-reducer.ts`) |
|---|---|---|
| Lines | 1072 | 626 |
| Framework coupling | 19 `cx.notify` / `cx.spawn` / `show_task_notification` / `self.save` / `transcript_*` call sites | **0** — the file has one import line and no I/O |
| Consumers | desktop | mobile **and** web |
| Tests | 10 driver-event tests in `src/app/tests.rs` | 244 lines in `event-reducer.test.ts` |

The Rust version is a desktop view-model reducer that also owns UI side effects
(toasts, notifications, transcript splicing, saves). The TS version is pure and
feeds two clients. They are coupled to different hosts, so they are not two
implementations of one thing — they are one protocol with two presenters.

### Why the TS layer is cheap to keep

Its dependencies are pure: `event-reducer.ts` (626 lines),
`transcript-presentation.ts` (598 lines), `provider-probe-cache.ts`, and the
`@waku/client` entry points. 51 import sites across `apps/mobile` consume it,
but they consume *types* and a handful of pure functions — no I/O, no
framework.

### Why UniFFI is the wrong tool here

1. **It targets Kotlin/Swift, not TypeScript.** The desktop is Rust (no bridge
   needed) and mobile/web are TS. UniFFI would help only if mobile were Kotlin
   or Swift, which is the Compose rewrite that was rejected.
2. **The real target would be `wasm32`**, to keep the TS consumers on TS.
   That is a different project with different constraints.
3. **The measured win is negative.** This is a 1,224-line pure module with 244
   lines of tests and zero I/O. Rewriting it in Rust and bridging it adds a
   build step, a wasm artifact, and a second language boundary — to remove a
   module that has not produced a correctness bug. The two defects fixed in
   PR #37 were both *client* bugs (event-pump cadence, missing reconciliation),
   not drift between the reducers.

## Decision

**Do not move the reducer to Rust behind UniFFI.** Keep the TS layer, and
single-source the *semantics* rather than the code.

The failure that motivated this question is real: the two reducers can disagree
about event handling, and nothing catches it. That is a test problem, not a
language problem.

## Consequences

Adopt one cheap control instead: a **shared event-vector conformance suite**.

- One JSON file of `{ event, expected session delta }` cases, checked in.
- `packages/waku-client` consumes it in `bun test`.
- `src/app` consumes the same file in a Rust test.
- Divergence becomes a red test in both repos instead of a bug report.

This costs an afternoon, catches the class of bug that actually occurs, and
does not add a build step.

## Revisit when any of these becomes true

- A **third** client appears, so the reducer has three hosts to keep aligned.
- The TS reducer grows I/O, or the two implementations diverge on real
  behaviour despite the conformance suite.
- Mobile moves to a **non-TS** runtime (Kotlin/Swift), which is the case where
  UniFFI is genuinely the right answer.
- A performance budget is set that pure TS demonstrably cannot meet — measured,
  not assumed.