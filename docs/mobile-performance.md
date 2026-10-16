# Mobile performance

How the Kerenzikov phone app stays smooth while an agent streams, what each
part is allowed to cost, and how to measure before you change any of it.

The app is React Native 0.86 on Expo 57, with Hermes and the New Architecture.
This is the phone version of [performance.md](performance.md), which covers the
desktop. The desktop rules do not transfer, because the threading is different.
The idea behind them does transfer: **a frame may only touch data that is
already in memory.**

The whole model fits in one line: **cost = how often JS re-renders × work per
render, plus how often the screen re-lays-out.**

The phone has two threads that matter:

- **The JS thread** runs your React render, the event reducer, and every
  `setState`.
- **The UI thread** (also called the compositor) runs native layout, scrolling,
  and any Reanimated worklet animation.

A frame is expensive when JS does work on every frame, or when layout changes on
every frame. Every rule below limits one of those two things.

Baseline we measured on a Galaxy A55 with a release build (2026-10-07, **before
the PanelUI reskin**, so it is a floor rather than a current reading): cold
start 636 ms (621, 631, 649, 643, first run thrown out); stream jank 1.79% while
idle-following and 6.42% while actively scrolling; frame times p50/p90/p95/p99
of 13 / 14-15 / 15-21 / 20-27 ms, with no frame over 30 ms; the panel at 120 Hz.
The app is not the bottleneck. When someone says it feels slow, the cause is
usually the daemon round-trip or the phone getting hot. Only re-measure (see
[Measuring](#measuring)) after a big change to boot or to the transcript.

---

## Who may cause a render

| What happens | What re-renders | Who is allowed to do it |
| --- | --- | --- |
| A stream commit | The live transcript row and the task-list summary entry | The runtime pump, at most ~8.3 times a second |
| An interactive event | The screen it affects, right away | Permissions, user input, turn start/finish |
| A user action | The component that handles it | Taps, scroll transitions |
| A Reanimated worklet | Nothing on the JS thread; the UI thread owns the frames | Veils, loaders, fades, cross-fades |
| A timer that re-arms itself | The component, on every tick, on the JS thread | **Never for decoration.** That is a paint loop (see the veil) |

The rule that keeps the app fast: a streamed token must reach **one row and
nothing else**. Nothing on the stream path may read the whole session object,
because the reducer replaces that object on every commit.

### The presentation layer is PanelUI, and its rules are ours

The UI is built from [PanelUI](https://panelui.dev) components, styled with
Uniwind (Tailwind v4) `className` and animated with Reanimated. That is not a
detail of taste — it decides which APIs are allowed:

- **Never use React Native's core `Animated`.** PanelUI's own performance rule
  forbids it alongside the library, and it is a real bug, not a style note: a
  core `Easing` function handed to Reanimated's `withTiming` is called on the UI
  runtime, where a plain JS function cannot run, and the process aborts with
  "Tried to synchronously call a Remote Function". That shipped once, in the
  streaming veil (`md/render.tsx`), and killed the app mid-turn. `Easing` comes
  from `react-native-reanimated`, never from `react-native`.
- **A `className` that compiles to nothing is a blank screen.** Uniwind compiles
  utilities at bundle time from the `@source` paths in `src/global.css`. Point
  one at a directory that does not exist and no utility is generated, so
  PanelUI's `flex-1` collapses the tree to zero height — with the provider's own
  background still painted, which is why it reads as "nothing renders" rather
  than as an error.
- **Import components by subpath** (`panelui-native/components/task`). The root
  entry re-exports all of them and Metro does not tree-shake, so a root import
  evaluates the whole library before the first screen paints.
- **`Collapse` keeps its children mounted.** `Task` and `Plan` fold their bodies
  by animating a clip height, not by unmounting. Rendering `null` into a closed
  one still builds nothing, but *rendering the body* into a closed one still
  lays it out. If a body is expensive, mount it on `open` — see
  [the activity surface](#the-activity-surface-what-one-long-task-cost). The
  reasoning trace used to be a third one of these; it is a sheet now, for the
  same reason.
- **Count the components a row builds.** This is the mobile form of the desktop
  rule that a frame may only touch what is already in memory: cost is
  *rows × components per row*, and a nested disclosure per section is how one
  real task reached 743 views.

---

## The two speeds

Everything during a stream runs at one of two speeds. Keep it that way.

**Stream commits, at most ~8.3 a second.** The constant is
`STREAM_COMMIT_MS = 120` in `apps/mobile/src/lib/runtime-context.tsx`. Provider
chunks pile up in `entry.pending`, and one full interval folds them into one
drain, one `cacheSession`, and one summary write. Two rules we learned the hard
way:

- **Only stream events wait for the tick.** `runtimeEventIsDeferrable` in
  `apps/mobile/src/lib/mobile-runtime.ts` returns true for `textDelta`,
  `reasoningDelta`, `usageUpdated`, and `backgroundWork`. Everything else
  (permissions, turn start and finish, errors) flushes right away, because the
  user must not wait 120 ms to see a prompt.
- **Adjacent deltas of the same kind fold into one reduce.** The pump joins a
  run of `textDelta` chunks and folds them once, the way the desktop's
  `pop_stream_batch` does. A burst of chunks becomes one reducer call, not one
  per chunk.

**Compositor animation, at screen speed, decided once in JS.** Anything visual
that changes every frame is a native-driver animation. JS picks the start, end,
duration, and curve up front. The JS thread works out *what* fades and *for how
long*; it never computes the value for each frame. See
[The compositor](#the-compositor).

---

## The stream pipeline

The path is `client.subscribe` → `entry.pending` → `flush` →
`reduceOne` / `advanceRuntimeEventCursor` → `cacheSession` →
`writeSessionCache`.

Three things keep it cheap:

- **Unknown events move the cursor without touching the data.**
  `runtimeEventTouchesSession` in `mobile-runtime.ts` is the place to add a wire
  kind the phone cannot draw. Folding such an event would deep-clone the whole
  session to change nothing on screen. Instead `advanceRuntimeEventCursor`
  returns a new object that reuses the same `messages` and `transcript_blocks`
  arrays, so no row is invalidated. `backgroundWork` used to fall through here
  before it got its own screen. That one gap cost about 5.8 ms per event on a
  1.9 MB transcript.
- **The task list gets a summary, not the session.** `writeSessionCache` in
  `runtime-context.tsx` projects through `sessionListSummary` in
  `mobile-runtime.ts`, then leaves the list's object identity alone when
  `sameListSummary` says nothing the list draws has changed. The list only draws
  title, provider, project, status, and recency. Sending it the transcript too
  rebuilt every row about 8 times a second.
- **The runtime context value is memoized.** React compares context by identity,
  not by fields. A fresh object literal re-renders every consumer on every
  provider render, and the provider renders on every commit. The value is built
  with `useMemo` over its state slices (`runtime-context.tsx:1350`), and every
  handler it exposes is already stable through `useCallback`.

Two smaller guards live in the pump. A deferred flush waits
`max(0, 120ms - time since last flush)`. A flush for an entry that has since
been replaced drops its buffer.

---

## Keeping the visible list small

**The transcript is an inverted, windowed `ScrollView`** in
`apps/mobile/src/components/transcript-list.tsx`. Rows mount newest-first inside
a container flipped with `scaleY(-1)`. That means native offset 0 *is* the visual
bottom, so following a stream is a property of the layout. No scroll command, no
measuring round-trip, no correction frame. `maintainVisibleContentPosition`
keeps a reader who scrolled away on their line. The scroll math lives in
`apps/mobile/src/lib/transcript-scroll.ts`, is pure, and has unit tests:

- Only `INITIAL_TAIL_ROWS = 40` rows mount when the screen opens. The window
  grows toward older history in `TAIL_ROWS_STEP = 40` steps, once fewer than
  `EXTEND_LEAD_VIEWPORTS = 1.5` screens remain above.
- The anchor is the first settled row of the running turn (`liveSkipIndex`), so
  growth inside one tall row is handled in a single native pass. When the reader
  sits at the bottom, the strip at index 0 is the anchor.
- The jump button uses hysteresis (`JUMP_SHOW_DISTANCE` and
  `JUMP_HIDE_DISTANCE`), so it does not flicker at the edge.

**The pipeline works per message; only the visible slice expands.**
`buildTranscriptPipeline` in `apps/mobile/src/lib/session-presentation.ts` is one
linear pass over messages, blocks, and turns. It never parses markdown for the
whole transcript. `expandTranscriptRows` parses only from `windowStart` to the
end, so opening a five-thousand-message session costs one pass, not thousands of
parses.

**Rows keep their identity across commits.** `stabilizeTranscriptRows` reuses the
previous render's row objects whenever a field-by-field check says nothing
changed. For markdown rows it compares `source`, not node identity, because the
incremental parser recreates the last two block nodes on every append. The
memoized `TranscriptRowView` then skips re-rendering, so a commit only re-renders
the live tail block.

**Markdown parses incrementally, once per streaming message.**
`IncrementalMarkdown` in `apps/mobile/src/md/parse.ts` never reparses the settled
prefix. Each append reparses only the tail from the last stable boundary. The
last two top-level blocks stay unsettled, matching the desktop's two-group rule.
`TranscriptMarkdownCache` in `apps/mobile/src/md/transcript-cache.ts` keeps one
live parser per streaming message plus a memo of finished parses. When a message
stops streaming, the cache adopts the live parser's tree, so row identities do
not change at the flip.

**The display tail is mended, not reflowed.** `closeHanging` in
`apps/mobile/src/md/mend.ts` appends fake closers to a display-only parse of the
final block. A half-streamed `**bold` shows as bold from the moment text follows
it, and the closing `**` does not reflow text already on screen. `displayTail()`
caches against the source, so it only recomputes when the text changed. This is a
port of the desktop's `md/mend.rs`; keep the two in step.

**A step's body is built when it is opened, not before.** One nested `Task` per
activity is the budget; a section inside it is not another `Task`. See
[the activity surface](#the-activity-surface-what-one-long-task-cost) below for
why, and for the measurement that found it.

**Reasoning is a sheet, not a fold.** The trace is the one thing in a transcript
that arrives as a wall of text — one giant paragraph or one giant list, so no
block-count cap bounds it — and `Collapse` keeps its children mounted. As an
inline fold it laid out every line of every trace whether or not anyone read it.
`BottomSheet.Content` returns `null` until it is first presented, so a closed
trace costs one row. The trace is assembled *inside* the sheet body, not in the
sheet's own render: the trim and the three regex passes in `plainReasoning` ran
over every trace on every commit when they sat above it. Same trade
`ActivityBody` makes for a step.

---

## The activity surface: what one long task cost

A reader reported that one task took ~11 s to open and then closed the app. The
cause was not where any of us looked first. It is worth writing down because the
wrong answers were all plausible, and only measurement separated them.

**The mechanism.** `ActivityDetail` renders one row per tool call inside a
group's `Task`. It passed `defaultOpen` unconditionally, and `DetailSection`
wrapped every section — the command, its output, its arguments — in *another*
full `Task`. So one step with a command and an output built three nested `Task`s,
each carrying a `Collapse` with its own shared value, an `Animated.View`, a
`Pressable` and an SVG chevron. A real transcript multiplies that: the measured
session held 390 activity groups, 977 activities, 1.3M characters of command
output, 628K of reasoning and 425K of arguments, with a single group holding 108
commands. The window mounts 40 rows, and those rows expanded into **743 views**.

Creating 743 views in one commit is what stalled the UI thread, and a stall long
enough on the main thread is an ANR — which is the "force close".

**The measurements.** Release build, x86_64 emulator, opening the same session:

| | before | after |
| --- | --- | --- |
| time to interactive | 11 163 ms | 3 774 ms |
| worst frame (`Davey! duration=`) | 6 444 ms | none logged |
| views in the hierarchy | 743 | 85 |

**What the wrong answers were, and what disproved each.**

- *The hydrate payload.* A 4.9 MB / 31-message session opened in 3.4 s while a
  1.5 MB / 541-message one took 11.2 s. It tracks rows, not bytes.
- *`buildTranscriptPipeline`.* 0.20 ms/call on 541 messages, and the on-device
  instrumentation put the whole derivation at 2 ms. The pipeline is per message
  and linear, as the section above says; it was never the problem.
- *Rendering the bodies.* Passing `defaultOpen={false}` changed nothing, because
  `Task.Content` feeds a `Collapse` that keeps its children mounted and animates
  only the clip height. Rendering `null` for a closed body changed nothing
  either, because the *derivation* above it still ran — `activityDisclosureSections`
  trims and returns the full output and arguments for every activity.
- *The JS thread.* It was the busiest thread at first (62% while opening), which
  is why the JS answers looked right. But instrumentation showed JS owned ~100 ms
  of an 11 s open; the rest was the native commit.

**How the cause was actually found.** Three hypotheses were falsified, so the
guessing stopped and the render path was instrumented directly: `recordBreadcrumb`
at each derivation phase, read back through the app's own log with `adb shell cat
/data/data/sh.waku.mobile/files/waku-errors.log` on a rooted emulator. That split
the open into JS (small) and everything else (large), which pointed at the view
count. `dumpsys activity top | grep -c 'View{'` then gave the number to fix.

The lesson generalises: **a stall is either work or views.** Split it with a
counter before touching either, because the JS side is the one that is easy to
measure and the view side is the one that usually costs.

---

## The compositor

Anything that changes every frame is a native-driver animation. JS decides what
fades and for how long. The UI thread draws.

- **The streaming veil is a schedule, not a sampler.**
  `apps/mobile/src/md/veil.ts` gives each fading run an opacity and the time it
  has left. `VeilFade` in `apps/mobile/src/md/render.tsx` turns that into a
  Reanimated worklet on the UI thread. Both the text and the reasoning tickers
  are gone, so a row only renders when its text changes. The old design re-armed
  a `setTimeout` every 33 ms (66 ms for reasoning) and rebuilt every fading
  span's colour string each frame. That is a paint loop competing with the very
  commits it was drawing. The speed-up for a burst is baked into a chunk's
  duration when the chunk is made, the only point where it can apply once the run
  animates itself. `opacity` multiplies both text and background alpha in native
  code, so the renderer passes a number, never a colour.
- **Loaders are one view.** `Blocks` in `apps/mobile/src/components/blocks.tsx` is
  a single pulsing square driven by one Reanimated shared value on the UI thread.
  It replaced a 3x3 grid that cost nine `useAnimatedStyle` subscriptions and a
  three-level view tree for every mounted loader. Loaders sit on the surfaces
  that scroll, one per running task row and one in the transcript tail.
- **Every other motion is native-driver too.** The jump button fade, the fold
  chevron rotation, the send/stop cross-fade (`SendStopSlot`, one fixed 36 dp slot
  so the toolbar never shifts), the fold reveal, and the archive undo pill (a
  Reanimated worklet in `task-drawer.tsx`). The activity-sheet pager is a
  Reanimated worklet for the same reason.
- **Reduced motion is respected.** `useReducedMotion` in
  `hooks/use-reduced-motion.ts` turns off the veil, pulses, and fades, matching
  the desktop's `cx.reduce_motion()` contract.

---

## The task list (drawer / sidebar)

The sidebar sees more stream commits than any other surface, so it gets its own
defenses.

**Two bugs we hit and fixed. Read these before you touch this screen.**

1. **The sidebar lagged while a task streamed.** Every commit reached the list
   and rebuilt every row, about 8 times a second. We fixed it three ways: (a)
   project task state to `sessionListSummary`, so a commit cannot invalidate the
   list; (b) key the regroup memo on `projects` plus the stabilized summaries,
   not on `taskState.data`; and (c) **page** each group. `paginateSections`
   mounts `SECTION_PAGE_SIZE = 6` rows and shows a "See more" row. A long group
   no longer mounts every row it would redo on each commit.
2. **The app lagged for about 30 seconds right after connecting to a daemon.**
   The first open of task history built the whole drawer while the connect-time
   queries were still landing. On a real phone that measured as a drawer frozen
   for 30 s or more, with 83% janky frames and a 99th-percentile frame of 1.55 s.
   We fixed it by holding `TaskDrawerContent` back until `useTaskState` has data,
   and earlier by not mounting the list at launch at all.

The current defenses, in one place:

- **A projection, not the session.** `useStableSessionSummaries` in
  `task-drawer.tsx` maps task state through `sessionListSummary` and
  `stabilizeSessionSummaries` in `session-presentation.ts`. One task updating
  invalidates its own row, not the whole list.
- **The regroup memo reads `projects` and the stabilized summaries, never
  `taskState.data`.** The runtime rewrites that object on every delta, so
  depending on it re-groups and re-renders the list about 8 times a second.
- **A group is paged.** `paginateSections` mounts `SECTION_PAGE_SIZE = 6` rows
  and shows "See more". A short group comes back untouched, so its rows stay
  memoized.
- **The list is built on first open, not at launch.** The drawer library calls
  `renderDrawerContent()` even while closed. `TaskDrawerHost` mounts the list on
  first open and keeps it mounted, so search and scroll survive closing.
- **The first open waits for the list to exist.** `TaskDrawerContent` renders
  only once `useTaskState` has data (or the daemon is not connected). The shell
  (pill, search, footer) paints right away, and the rows fill in on the frame the
  cache lands.
- **Callbacks are pulled out of the runtime context value.** We destructure
  `archiveSession` and `deleteSession`, so a rebuilt context object does not hand
  `SessionRow` a new callback and defeat its `memo`.

### After connecting to a daemon

Connecting is a burst of work on the JS thread, and the sidebar sits right in the
middle of it. So we refresh it later, not eagerly.

- **A reconnect invalidates; it does not refetch per screen mount.**
  `noteConnected` in `lib/daemon-context.tsx` invalidates the `task-state` and
  `session` queries on every reconnect after the first. Any notification sent
  while the link was down is gone, so this is how the list learns what changed.
  Followed runtimes replay their own missed events, and the sidebar never polls.
- **`taskStateChanged` refetches only what is not followed live.** The daemon
  announces another client's writes through `subscribeTaskState`. The handler in
  `runtime-context.tsx` invalidates hydrated sessions the client is not already
  following, so watching a task driven from the desktop stays current without
  re-hitting sessions that stream their own updates.
- **`staleTime: 1_000` on task state and sessions** (`hooks/use-daemon-data.ts`)
  stops a burst of invalidations within one second from each firing a fetch, while
  still letting a real reconnect pick up changes quickly.

---

## Boot and first paint

- **The splash hides on the profile read, not on the connection.** We set `booted`
  as soon as the saved profiles are read, before `activate()` awaits the
  WebSocket handshake (`lib/daemon-context.tsx`). The connection reports itself
  through the banner, which every screen already shows. A 5 s backstop covers a
  stalled keystore read. `hydratePersistentStorage` starts in the same effect.
- **The transcript waits two frames.** The route, header, and composer get the
  first commit alone. `SessionView` mounts the `TranscriptList` on the second
  `requestAnimationFrame` after the session id is known
  (`components/session-view.tsx`). Building the pipeline and expanding markdown
  are synchronous, so doing them in the first render delays the native screen.
  That gap shows an empty body, never a spinner. A spinner there was the blink
  you saw on every open.
- **Provider model lists come from a cache first.** `readProviderProbeCache` in
  `hooks/use-daemon-data.ts` gives the picker instant data across restarts, and
  the fresh probe revalidates after the shared staleness window.
- **Update checks are cached.** `checkForUpdateCached` and `peekUpdateCheck` in
  `lib/app-update.ts` keep the answer for five minutes, so Settings does not
  flash "checking" on every visit.

---

## Composer, keyboard, and storage

- **One keyboard listener for the whole app.** `KeyboardOffsetProvider` in
  `lib/keyboard-offset.tsx` tracks the keyboard height once. The composer reads
  it instead of adding its own listener. It returns 0 on iOS, where
  `KeyboardAvoidingView` already lifts the content, so consumers can add it
  without double-lifting.
- **Draft sync is debounced and ordered.** `useSyncedComposerDraft` writes a real
  local edit 800 ms after it settles, through a serialized queue. It never echoes
  a daemon-hydrated value back as an edit.
- **Storage is split by sensitivity.** Profiles and the active-daemon id live in
  `AsyncStorage`. Daemon tokens live in the device keychain through `SecureStore`
  (`lib/daemon-storage.native.ts`). The boot path reads profiles and the active id
  in parallel.
- **A single WebSocket message must stay well under 16 MiB.** React Native's
  Android socket is OkHttp, and `RealWebSocket.send` closes the connection with
  code 1001 the moment a queued message would take its buffer past 16 MiB — it
  does not reject the send, it kills the link. The app reports that as
  "Kerenzikov daemon disconnected", which names none of it. Anything that can
  carry user-sized data has to be chunked rather than sent whole:
  `lib/attachments.ts` streams an attachment through
  `beginAttachmentUpload` / `appendAttachmentUpload` / `finishAttachmentUpload`
  in 1 MiB pieces (`ATTACHMENT_CHUNK_BYTES`) for exactly this reason, and that
  ceiling is what sets the chunk size — not the daemon's 32 MiB per-attachment
  limit, which is the one the protocol advertises and is unreachable in a single
  frame.

---

## Measuring

Sampling on its own misled us for hours. Use counters and frame histograms. In
order of usefulness:

1. **`gfxinfo` while streaming** gives the real frame stats:
   ```powershell
   Y:/Android/Sdk/platform-tools/adb.exe shell dumpsys gfxinfo sh.waku.mobile reset
   # stream for 60-120 s without touching the screen, then:
   Y:/Android/Sdk/platform-tools/adb.exe shell dumpsys gfxinfo sh.waku.mobile
   ```
   Read the jank percentage, p90, and p99, and the tail of the HISTOGRAM. Any
   bucket at 30 ms or more is a real stall. On a 120 Hz panel the legacy "Janky
   frames" line counts against the naive 8.3 ms deadline and reads about 99% for
   anything, so use it only as proof the panel runs at 120 Hz. "Number High input
   latency" is unreliable on One UI.
2. **Cold start.** Run `am force-stop` then `am start -W`. Throw out the first run
   (the disk cache warms up) and average four. A cold number only comes after a
   `force-stop`; a warm run reports `TotalTime: 0`.
3. **The dev motion probe.** `useDevProbe` in `session-view.tsx` (behind
   `__DEV__` and `devPrompt`) reports scroll drift, growth count, and direction
   reversals. A screen recorder captures about 8 real fps and cannot tell a seated
   stream from a bouncing one, but the scroll events can. **Drift 0 across a fast
   stream** is the pass condition. Direction reversals ("flips") mean a
   compensation fight.
4. **CPU traces across a whole turn.** Poll `ps -o %cpu= -p <pid>` every 500 ms
   from the trigger until it settles. Report the phase plateaus, not just the
   average.

**One rule for comparisons:** every number you compare must come from the same
build type (release or debug) and the same device. Debug RN reads JS from Metro
and carries dev-mode overhead, so its numbers mean nothing for user-facing claims.
A release APK has the bundle inside and needs no Metro. Let the phone cool between
runs, because the A55 throttles under sustained load and heat drifts the numbers
(`dumpsys thermalservice`).

---

## What not to touch

These pieces carry weight and have tests:

- **`STREAM_COMMIT_MS = 120`** and the summary projection. `sessionListSummary`
  is pinned by `session-presentation.test.ts` and `mobile-runtime.test.ts`. If the
  projection ever grows a field that changes per commit (a transcript slice, a
  token count), every commit makes a new list object and the sidebar bug returns.
- **The inverted-ScrollView design.** The reason we do not use FlatList or
  FlashList is written in `transcript-scroll.ts`. The anchor and offset logic is
  on purpose.
- **The veil schedule.** It is pure and has tests (`md/veil.test.ts`). A timer
  that samples it is a paint loop.
- **The mended display tail.** `md/mend.ts` must stay in step with the desktop's
  `md/mend.rs`.
- **One `Task` per activity, and no `Task` for a section.** `DetailSection` is a
  plain `View` on purpose. A section has no state of its own to fold, and a
  nested `Task` costs a `Collapse`, an `Animated.View`, a `Pressable` and an SVG
  chevron. Three levels of them per step is what made one real task take 11 s to
  open and then ANR; see
  [the activity surface](#the-activity-surface-what-one-long-task-cost).
- **A closed step builds no body.** `ActivityBody` mounts only when the step is
  open, and `StepGroup` mounts its window of steps only when the group is open.
  Rendering the body into a closed `Collapse` is not the same thing: `Collapse`
  keeps children mounted.
- **A closed reasoning trace builds no body either.** `ReasoningSheet`'s trace
  is assembled in the sheet body, behind `BottomSheet.Content`'s
  `if (!presented) return null`. Moving that work back above the sheet — where
  it is easier to read — puts the trim and three regex passes back on every
  stream commit.

---

## The floor, and what is left

With both speeds in place, one streaming commit still re-renders the live tail
block and runs one incremental markdown parse. That is the floor for this design.
**FlashList recycling for very long transcripts** is parked on purpose: it risks
the inverted-ScrollView anchor design. Do not chase it unless measurements show
memory or scroll jank that windowing cannot explain. Smaller ideas, not yet
proven: flattening inline style arrays, and memoizing span construction per
finished markdown block.

A Compose rewrite (2-4 weeks) would give faster cold start through AOT-compiled
Kotlin and full control of the text pipeline. But the numbers above already meet
target, so that rewrite is about cold start and platform ownership, not about
streaming frames.
