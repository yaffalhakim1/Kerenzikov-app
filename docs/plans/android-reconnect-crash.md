# Plan: Android app exits after reconnect when opening a running task

**Branch:** `investigate/android-reconnect-crash`
**Status:** Phases 1–5 implemented and unit-tested; device validation pending.
**Related docs:** `docs/mobile-performance.md`, `docs/adr/0003-daemon-owned-command-queue.md`

## Implementation status

| Phase | Change | State |
| --- | --- | --- |
| 1 | One clone per batch (`reduceRuntimeEventInPlace`, `cloneSession`) | done |
| 2 | Bounded chunked drain (`CATCH_UP_CHUNK_EVENTS` / `CATCH_UP_CHUNK_MS`), `catchingUp` indicator | done |
| 3 | Persist suppressed during catch-up, one write after drain | done |
| 4 | Reconnect invalidates only unfollowed sessions (`followed-sessions.ts`) | done |
| 5 | Overflow marks the runtime for hydration (`takeOverflowedRuntime`) | done |
| 6 | 10 MiB native read ceiling / paginated hydration | not started (follow-up) |

Files touched: `packages/waku-client/src/{event-reducer,client}.ts`,
`apps/mobile/src/lib/{runtime-context,mobile-runtime,daemon-context}.tsx`,
`apps/mobile/src/lib/followed-sessions.ts` (new),
`apps/mobile/src/components/session-view.tsx` (header indicator).

Unit tests: `packages/waku-client` 41 pass, `apps/mobile` 295 pass.

### Device verification (release build, `x86_64`, emulator)

- Release APK built with `-PreactNativeArchitectures=x86_64` and installed over a
  debug uninstall.
- `maestro/reconnect-open-task.yaml` passes: launch → Home → relaunch → tap the
  first task immediately → composer still visible.
- After the run: process id unchanged, no `lowmemorykiller`, no
  `OutOfMemoryError`, no `ANR in sh.waku.mobile`, no `FATAL EXCEPTION`;
  `dumpsys meminfo` total ≈ 165 MB with native heap ≈ 53 MB.
- "Catching up…" did not appear, as expected: a Home/relaunch outage leaves a
  backlog below one chunk, so the drain finishes before the assertion. The
  chunked path is covered by the unit test for the fold and by the bounded-drain
  code itself; forcing a multi-chunk backlog needs the daemon to accumulate
  events while the phone is disconnected, which is the manual step below.



---

## Symptom

- A long task runs for hours on the desktop daemon.
- The phone app was closed or backgrounded; the daemon kept running and kept receiving events.
- Reopening the phone reconnects the WebSocket quickly.
- Within roughly the first **1–2 minutes** after reconnecting, tapping a task in the sidebar makes the app exit ("thrown out").
- If the user waits 1–2 minutes after reconnecting, then taps the same task, it works.
- Session-page components were already made render-on-demand; the expensive work is invisible.

The WebSocket itself is not failing. The process is being killed or blocked while the JS thread does heavy work that has no visible UI.

---

## Evidence chain (read from the tree)

### 1. The daemon replays up to 2048 events per followed runtime on reconnect

`crates/waku-core/src/server.rs:46`

```rust
const MAX_REPLAY_EVENTS_PER_SESSION: usize = 2048;
```

`subscribe()` replays every journaled event newer than the client's cursor (`server.rs:408-442`). The journal is per `(session_id, runtime_id)` and rolls over at 2048 events.

### 2. The client keeps cursors and subscriptions across reconnect attempts

- `apps/mobile/src/lib/daemon-link.ts:64-67` — "The client keeps its replay cursors and subscriptions across attempts, so a reconnect resumes every followed runtime where it left off."
- `packages/waku-client/src/client.ts:191-243` — `connect()` sends `resumeFrom: this.replayCursors()` in the hello.
- `packages/waku-client/src/client.ts:413-418` — cursors come from the last **received** sequence per runtime.

So a phone that was away for hours asks for everything the daemon still has for that runtime: up to 2048 events.

### 3. Every event is reduced through a full deep clone

`packages/waku-client/src/event-reducer.ts:72-78`

```ts
export function reduceRuntimeEvent(
  current: AgentSession,
  wire: SequencedEvent,
  ...
): RuntimeEventResult {
  const session = clone(current)
  ...
```

`packages/waku-client/src/event-reducer.ts:742-743`

```ts
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
```

`AgentSession` carries `messages`, `transcript_blocks` and `turns` (`crates/waku-protocol/src/model.rs:1206-1213`). The clone therefore serializes and re-parses the **entire transcript** for every single event.

The code itself quantifies this: `apps/mobile/src/lib/runtime-context.tsx:544-552` says reducing a meta event "would deep-clone the whole session — 4ms on a 1.3 MB transcript".

2048 events × 4ms is already ~8 seconds of pure clone CPU on a mid-size transcript, plus allocation and GC. A multi-megabyte transcript multiplies that into the observed 1–2 minute window.

### 4. The mobile flush applies every buffered event through that clone

`apps/mobile/src/lib/runtime-context.tsx:522-573` — `flush()` takes the whole `entry.pending` buffer, then loops:

```ts
for (const event of batch) {
  if (!shouldApplyRuntimeEvent(state.current, event)) continue;
  ...
  reduceOne(state, event)   // -> reduceRuntimeEvent -> clone()
}
```

So N replayed events cost N deep clones.

### 5. Non-deferrable events flush synchronously, one event at a time

`apps/mobile/src/lib/runtime-context.tsx:591-605`

```ts
const unsubscribe = client.subscribe(session.id, runtimeId, (event) => {
  entry.pending.push(event);
  if (!runtimeEventIsDeferrable(event)) {
    ...
    flush();          // immediate, per event
    return;
  }
  ...
});
```

Only `textDelta`, `reasoningDelta`, `usageUpdated` and `backgroundWork` coalesce (`mobile-runtime.ts:364-370`). Activities, turn boundaries, prompts, permissions and todo updates each trigger their own flush and therefore their own full clone. A long agent turn is exactly the kind of session with hundreds of activity events.

### 6. The reload path repeats the same pattern

`apps/mobile/src/lib/mobile-runtime.ts:414-431` — `foldRuntimeEvents` reduces a buffer with `reduceRuntimeEvent` per event, so it also clones once per event. It is called by `reloadSession` (`runtime-context.tsx:749-773`).

### 7. Reconnect also invalidates every cached session query

`apps/mobile/src/lib/daemon-context.tsx:164-173`

```ts
if (connections > 1) {
  void queryClient.invalidateQueries({
    queryKey: ["daemon", profileId],
    predicate: (query) =>
      query.queryKey[2] === "task-state" || query.queryKey[2] === "session",
  });
}
```

`useSession` (`apps/mobile/src/hooks/use-daemon-data.ts:67-83`) then re-runs `hydrateSession`, and the daemon answers with a full session clone (`crates/waku-core/src/daemon.rs:617-634`). Tapping a task at that moment can race a background refetch of the same or other sessions, adding more full-transcript JSON parsing.

### 8. Persistence serializes the full session during the replay

`apps/mobile/src/lib/runtime-context.tsx:336-351` — `schedulePersist` fires 500ms after a mutation and calls `persistSession`, which sends the whole session (including the transcript) back to the daemon (`apps/mobile/src/lib/daemon-api.ts:572-586`). A replay spanning seconds triggers repeated full-transcript serialization and network traffic.

### 8b. Two delivery shapes explain both versions of the report

The replay costs the same either way, but *when* the cost lands depends on whether the session screen was mounted during the reconnect:

- **Listener already attached** (the app restored the session route, or it is still mounted behind the drawer): replayed events flow into `entry.pending` and are flushed at ~8.3 Hz for 1–2 minutes. Tapping during that window stacks a hydrate on top of the busy drain → crash. Waiting until the drain finishes → the same tap is cheap. This matches "waiting 1–2 minutes fixes it".
- **No listener attached** (the app is on the task list): the client buffers replayed events in `pendingEvents` (`client.ts:471-476`, capped at 4096). Tapping subscribes, and `subscribe()` drains the whole buffer synchronously into the listener (`client.ts:390-394`), so the entire replay is reduced in the tap's first flush. Here the tap itself is the trigger.

Phase 2's chunked drain fixes both shapes; Phase 5 fixes the buffer overflow in the second one.

### 9. Hard payload ceiling for native clients

`crates/waku-core/src/server.rs:62-81` — a native client can be sent at most `NATIVE_READ_BYTES = 10 MiB` in one message, because OkHttp closes the socket with 1001 past 16 MiB. Very long sessions approach this ceiling on `hydrateSession`; that is a separate failure mode but relevant to "long session" reports.

---

## Root cause

**The replay is applied one event at a time, and each event deep-clones the entire transcript via `JSON.parse(JSON.stringify(...))`.**

That turns a 2048-event catch-up into 2048 full-transcript copies:

- JS thread occupied for seconds to minutes (invisible; no progress UI),
- large amounts of short-lived garbage (the whole transcript per event) causing GC churn and a memory peak on Android,
- synchronous flushes for non-deferrable events, so the work is not even spread across ticks.

Tapping a task during that window adds a second full-transcript parse (`hydrateSession`) and transcript construction. The peak crosses the Android per-app memory limit, or the main thread is blocked past the ANR threshold; either way the OS ends the app. Waiting 1–2 minutes lets the replay drain, after which a tap is just one hydrate — which is why it then works.

The WebSocket reconnect being "fast" is consistent: the handshake is cheap; the expensive part is the replay that begins immediately after it.

---

## Hypotheses, ranked

| # | Hypothesis | Confidence | Notes |
| --- | --- | --- | --- |
| H1 | Replay × per-event deep clone → CPU/GC/memory spike | High | Proven by code paths above; explains timing and long-session dependence |
| H2 | One giant synchronous flush (up to 2048 events) blocks the JS thread | High | Same fix family as H1; confirms as ANR rather than OOM |
| H3 | Client buffer overflow silently drops oldest events while the cursor advances | Medium | `client.ts:13, 471-476`; correctness bug, amplifies repeat replay |
| H4 | Reconnect invalidation refetches several full sessions at once | Medium | Adds a second source of full-transcript parses |
| H5 | Very long session exceeds the 10 MiB native read cap | Low–Medium | Would show as a failed hydrate, not necessarily a crash |

H1 and H2 share the same root; H3/H4 are amplifiers worth fixing in the same change.

---

## Measure before changing code

Distinguish OOM from ANR first. The fix is the same family, but the evidence decides the acceptance test.

1. **Crash classification**
   ```powershell
   adb logcat -c
   # reproduce: reconnect, then tap within 5 s
   adb logcat -d | Select-String -Pattern "lowmemorykiller|OutOfMemoryError|FATAL EXCEPTION|ANR in sh.waku.mobile|Force finishing"
   ```
2. **Memory**
   ```powershell
   adb shell dumpsys meminfo sh.waku.mobile
   ```
   Sample before reconnect, during the 1–2 minute window, and on tap. Look for native heap / Java heap growth toward the device limit.
3. **Frames**
   ```powershell
   adb shell dumpsys gfxinfo sh.waku.mobile reset
   # reproduce
   adb shell dumpsys gfxinfo sh.waku.mobile
   ```
   Multi-second frames confirm the synchronous flush.
4. **Dev counters (temporary, not shipped):** events received, flushes, max flush size, total clone milliseconds, peak `entry.pending` length. Print once per drain.
5. **Daemon side:** log how many events a hello replays per runtime (dev-only) to confirm the volume is actually near 2048.
6. **Profile:** Hermes sampling profile / React Native DevTools during the reconnect window; `JSON.stringify` / `JSON.parse` should dominate.

Acceptance evidence: the same reproduction produces no `lowmemorykiller`, no ANR, bounded `meminfo`, and no multi-second frames.

---

## Fix plan

The order matters: Phase 1 removes the quadratic work, Phase 2 removes the blocking, Phase 3 removes the redundant network/CPU pressure.

### Phase 1 — One clone per flush, not one per event

**Goal:** 2048 clones → 1 clone per committed batch.

- Add an in-place reducer entry point beside the existing one:
  - `reduceRuntimeEventInPlace(session, event, ...)` mutates the object it is given.
  - `reduceRuntimeEvent` stays the public, cloning wrapper used by single-event callers and tests.
- In `flush()`:
  1. Read the cached session.
  2. Clone it **once**.
  3. Apply every buffered event with the in-place reducer.
  4. `cacheSession` once at the end.
- In `foldRuntimeEvents`: clone once, then reduce in place.
- Never mutate the object returned by `queryClient.getQueryData`; it is shared with memoized consumers. Clone first, then own it.

This alone changes the replay cost from `N × transcript` to `1 × transcript`.

**Files:** `packages/waku-client/src/event-reducer.ts`, `apps/mobile/src/lib/runtime-context.tsx`, `apps/mobile/src/lib/mobile-runtime.ts`.

### Phase 2 — Bound work per tick

**Goal:** no single JS task exceeds a frame budget, so Android never sees an ANR.

- Drain `entry.pending` in chunks: at most K events or T milliseconds per tick (start with 200 events / 8 ms), then `setTimeout(0)` the continuation.
- While a backlog exists, coalesce **all** events for the commit tick; do not flush synchronously per non-deferrable event.
- Commit (update React Query) once per chunk; the transcript converges over a few seconds.
- Expose `runtime.catchingUp` (derived from backlog length) so the session header can show a small "catching up" indicator. Do not block interaction.

**Files:** `apps/mobile/src/lib/runtime-context.tsx`, `apps/mobile/src/components/session-view.tsx` (indicator only).

### Phase 3 — Stop persisting during catch-up

- Track `entry.replaying` / backlog state.
- Suppress `schedulePersist` while a backlog is draining; persist once after the final chunk, and only if the session actually changed since the last persist.
- This removes repeated full-transcript `saveTaskState` traffic during replay.

**Files:** `apps/mobile/src/lib/runtime-context.tsx`.

### Phase 4 — Narrow reconnect invalidation

- On reconnect, always invalidate `task-state`.
- Invalidate `session` queries only for sessions **without** a live runtime entry; followed runtimes already reconcile through the replay.
- Keep `reloadSession` for the explicit "reload transcript" menu action.

**Files:** `apps/mobile/src/lib/daemon-context.tsx`.

### Phase 5 — Cursor and buffer correctness

Two separate cursors: **received** vs **applied**.

- Today `sequences` advances on receipt (`client.ts:454-478`), including events still sitting in `pendingEvents`. If the 4096-event buffer overflows and drops the oldest (`client.ts:471-476`), those events are gone while the cursor has already moved past them — a silent transcript gap and a source of repeated replay.
- On overflow: mark the runtime `needsHydrate`, clear the buffer, and hydrate on the next attach/reload so the transcript is rebuilt from the daemon rather than silently truncated.
- Only advance the cursor past events that were actually applied (or explicitly reconciled by a hydrate).

**Files:** `packages/waku-client/src/client.ts`, `apps/mobile/src/lib/runtime-context.tsx`.

### Phase 6 — Long-session payload (follow-up, larger)

- Verify behaviour when `hydrateSession` approaches `NATIVE_READ_BYTES` (10 MiB).
- If real long sessions reach it, paginate hydration (recent turns first, older turns on demand) instead of raising the ceiling. This is a protocol change and should be its own task.

**Files:** `crates/waku-core/src/daemon.rs`, `crates/waku-protocol/src/protocol.rs`, mobile session loading.

---

## Test plan

### Unit (bun, `apps/mobile` and `packages/waku-client`)

1. A flush of K events performs exactly **one** session clone (spy on the clone helper or `JSON.stringify`).
2. `reduceRuntimeEventInPlace` produces the same session as `reduceRuntimeEvent` for a fixture of every event kind.
3. Chunked drain preserves order, dedupe and final cursor; each chunk commits once.
4. A backlog never blocks: simulated 2048 events drains in multiple ticks, each under the budget.
5. `schedulePersist` does not fire during catch-up and fires exactly once after drain.
6. Buffer overflow sets `needsHydrate`, does not advance the applied cursor past dropped events, and triggers a hydrate on the next attach.
7. Reconnect invalidates `task-state` but not sessions that already have a live runtime entry.

### Integration / manual (Android emulator, per `AGENTS.md`)

**Test the release variant, not debug.** A debug build runs with Metro attached, the
JS inspector, and dev-mode overhead; it hides exactly the class of failure this fix
addresses (JS-thread saturation, GC pressure, memory ceiling). Build and install
`--variant release` so the JS is Hermes-compiled and bundled, which is what users run:

```powershell
# Release APK (bundled JS, no Metro). Signature differs from debug, so the debug
# install must go first: INSTALL_FAILED_UPDATE_INCOMPATIBLE otherwise.
adb uninstall sh.waku.mobile
bun --filter @waku/mobile run android --variant release
```

The debug APK is only acceptable for iterating on the fix itself; every acceptance
run below is on the release build.

1. Seed or run a long task (500+ turns, many activities) so the transcript is multi-megabyte.
2. Background the app; let the task run or seed the journal toward 2048 events.
3. Reconnect and tap the running task **within 5 seconds**.
   - App survives; transcript renders; no `lowmemorykiller`, no ANR.
4. Repeat after waiting 2 minutes; behaviour must remain correct.
5. Ask the daemon to produce more events than the journal holds; after catch-up, the transcript is complete via hydration reconciliation.
6. `dumpsys gfxinfo`: no multi-second frame stalls during catch-up; `meminfo` bounded.

### Automation with Maestro

Maestro is installed. It drives the release build through the same flow on every run,
so the reconnect path is regression-tested rather than re-verified by hand.

Docs: [run your first test](https://docs.maestro.dev/maestro-cli/run-your-first-test-with-the-maestro-cli) ·
[CLI commands and options](https://docs.maestro.dev/maestro-cli/maestro-cli-commands-and-options)

**Layout.** Flows live in `apps/mobile/maestro/` (the repo already has a `maestro/`
directory at the root; put flow files beside it so `maestro test` can be pointed at
either).

**Commands used**

| Command | Purpose here |
| --- | --- |
| `maestro test <flow.yaml>` | Run one flow |
| `maestro test apps/mobile/maestro/` | Run the whole directory |
| `maestro test --format junit --output report.xml <flow>` | CI-readable result |
| `maestro studio` | Inspect the live app's view hierarchy while writing a flow |
| `maestro hierarchy` | Dump the current tree to find selectors |
| `maestro record <flow>` | Capture the run as a video artifact |

**Flow 1 — reconnect then open a running task (`reconnect-open-task.yaml`)**

```yaml
appId: sh.waku.mobile
---
- launchApp:
    clearState: false        # keep the saved daemon profile and token
- extendedWaitUntil:
    visible: "New Task"      # or the task-list header id used by the app
    timeout: 30000
- assertNotVisible: "Reconnecting…"
# Force the socket down and let the app rebuild it: background/foreground is the
# cheapest reproducible outage, and it exercises the same probe-then-replay path.
- pressKey: Home
- waitForAnimationToEnd
- launchApp
- extendedWaitUntil:
    visible: "Catching up…"   # only present while a backlog drains
    timeout: 15000
    optional: true
- tapOn:
    text: ".*"               # the running task's row
    index: 0
- extendedWaitUntil:
    visible: "Catching up…|Stop"   # the session screen is alive
    timeout: 15000
# The failure was the process dying here. Reaching the composer proves it did not.
- assertVisible:
    id: "composer-input"
- takeScreenshot: reconnect-open-task
```

Adjust the selectors to the app's real accessibility ids; `maestro hierarchy` prints
them for the currently rendered screen. `optional: true` on the "Catching up…" check
keeps the flow valid when the backlog is small enough to drain before the assertion.

**Flow 2 — release-build smoke (`smoke.yaml`)**

```yaml
appId: sh.waku.mobile
---
- launchApp
- assertVisible: "New Task"
- tapOn: "New Task"
- assertVisible:
    id: "composer-input"
```

**Pass criteria.** Both flows complete without the app disappearing (Maestro reports
`App crashed` or a lost hierarchy when the process dies), and the screenshots show the
session screen with the transcript rendered.

**CI.** `--format junit` output attaches to the workflow as a test report; the flow
directory runs against the release APK built in the same job.


### Regression

- Desktop and web share `event-reducer.ts`; their single-event callers must behave identically.
- Streaming cadence stays at ≤ ~8.3 Hz for visible updates (`docs/mobile-performance.md`).
- Terminal streaming and background-work events still apply in order.

---

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| In-place mutation leaks into the React Query cache | Clone once before the batch; never mutate the object read from the cache |
| Chunking reorders or drops events | Keep the existing dedupe gates; assert order in tests; persist only after the final chunk |
| Reduced responsiveness during catch-up | Chunks keep each task short; the transcript converges; show a "catching up" indicator instead of freezing |
| Cursor semantics change breaks resume | Separate received/applied explicitly; add tests for reconnect after overflow and after partial drain |
| Desktop/web regressions | Keep the public cloning reducer unchanged; only the mobile flush and fold use the in-place path |
| Fix hides a daemon-side issue | Measure the actual replay count and payload size first; Phase 6 covers the read ceiling |

---

## Rollout

- Behaviour-preserving for normal streaming; the win is concentrated in reconnect catch-up and long transcripts.
- Validate on the emulator with `-gpu host` and then on a physical device.
- Ship as one PR: Phase 1–2 are the fix; Phase 3–5 are the amplifiers and correctness fix. Phase 6 is a separate follow-up if the 10 MiB ceiling is reachable.

---

## Open questions

1. Does the crash report as OOM or ANR on the user's device? The logcat classification decides the primary acceptance metric.
2. How large is the running task's transcript (messages + blocks + turns) in bytes? That determines whether the 10 MiB ceiling is also involved.
3. How many events does the daemon actually replay for this session (near 2048)? A dev-only log on hello answers it.
4. Should a followed runtime's replayed deltas drive a full transcript render, or should the list show "catching up" until the backlog drains? Product call; the plan assumes visible convergence without blocking.
