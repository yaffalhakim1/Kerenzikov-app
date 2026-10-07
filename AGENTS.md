# Kerenzikov development guidance

## Development runtime

- Assume `bun ./scripts/dev.ts` is already running and owns the current
  `Kerenzikov Debug.app` process. Source changes are rebuilt, signed, and relaunched
  automatically. Only run it yourself if not already launched.
- During normal development and UI validation, do not run
  `scripts/bundle.sh debug`, start a second watcher, or manually quit/relaunch
  `Kerenzikov Debug.app`. Quitting the app also stops the watcher.
- After an edit, wait for the watcher to finish its successful rebuild and
  validate the freshly relaunched debug app. Only start or recover the watcher
  manually when it is confirmed unavailable.
- No visual test unless requested.

## Performance

- Treat performance as a product requirement, not a follow-up. Kerenzikov is a native
  app competing with web clients, and staying smooth under a long transcript on
  a high-refresh display is the point of being native. Prefer the faster design
  when it costs nothing in clarity, and measure before assuming a cost is fine.
- Never block the UI thread with heavy work. Rendering owns it, so anything a
  frame can reach must already be in memory: no subprocess spawns, no
  filesystem walks, no network, no blocking locks, no synchronous IPC.
- Row builders and measurement paths run for every visible item on every frame.
  Treat I/O reached from `render` as a defect even when it looks cheap, is
  cached after the first hit, or only triggers for some rows — one `git`
  invocation is already several frames of budget.
- Move the work to `cx.background_executor().spawn`, store the result on the
  entity, and `cx.notify()` when it lands. Render then reads only that store,
  and a miss means "not known yet" and must degrade gracefully.
- Resolve a whole session or collection in one background pass instead of
  probing per item, and guard it with a generation counter so a result from a
  superseded pass cannot overwrite newer state.
- One-shot user actions such as a click or menu command may work synchronously
  when freshness matters more than latency; frames may not.
- Keep per-frame work proportional to what is on screen. Long collections are
  virtualized with `list()`, and a row builder must not rebuild whole-session
  state; hoist that to a cache refreshed once per frame.
- Streaming CPU is governed by two cadences — stream commits at ≤ ~8.3 Hz and
  pulse-clock ticks at ≤ 60 Hz (loaders; other pulses stay at ≤ ~30 Hz) —
  and by what one frame can see. Read
  [docs/performance.md](docs/performance.md) before touching the event pump,
  the pulse clock (`src/ui/motion.rs`), veils, overlay scrollbars, pane
  caching, or anything else a streaming frame reaches; it also records the
  counter-based measurement playbook that actually finds regressions.

## Mobile performance

The phone app is React Native, so the desktop's rules do not carry over — but
the principle does: rendering owns the frame, and anything a frame reaches must
already be in memory.

- Frame work belongs on the compositor. An animation driven by a JS timer
  (`setTimeout` / `setInterval` / `requestAnimationFrame` re-arming itself) is a
  paint loop on the JS thread, and it competes with the stream commits it is
  drawing. Use `Animated` with `useNativeDriver: true` when the start, end,
  duration and curve are known up front; a Reanimated worklet when the value
  depends on something only known mid-animation; JS only when layout must
  change (`apps/mobile/src/components/activity-sheet.tsx` is the worklet
  precedent).
- Never compute per frame what the renderer takes as a number. Animating a
  colour — parsing and rebuilding a string, per span, per frame — is the usual
  offender; `opacity` multiplies foreground and background alpha natively, so
  pass the number and let it. Computing a colour once at render is fine; doing
  it in a frame loop is not.
- Smells that mean a JS paint loop: a timer that re-arms inside a `useEffect`
  with no dependency array, `Date.now()` read during render, and a cache
  wrapped around a value that is computed every frame. The cache is the tell —
  it means someone knew the work was too expensive per frame, and the answer is
  to stop doing it per frame rather than to remember it.
- Precedent: the streaming veil decides in `apps/mobile/src/md/veil.ts` (a pure
  schedule handing each span an opacity and its remaining time) and draws in
  `VeilFade` (`apps/mobile/src/md/render.tsx`) — decide once in JS, draw on the
  compositor.
- Never block first paint on the network or on storage. `booted` hides the
  splash as soon as the saved profiles are read, before the daemon connects
  (`apps/mobile/src/lib/daemon-context.tsx`); the connection reports itself
  through the banner instead. Long or repeated reads off the daemon get a
  short-lived cache rather than a re-fetch per screen mount
  (`apps/mobile/src/lib/app-update.ts`).

## Android emulator

- Two SDKs live on `Y:`. `ANDROID_HOME` / `ANDROID_SDK_ROOT` are set user-wide
  to `Y:\Android\Sdk` (build-tools, platforms, ndk, cmake). The emulator and the
  `agent-avd` AVD (Pixel 6, Android 14 / API 34, Google APIs x86_64) live in a
  separate install at `Y:\android-sdk`, with the AVD under `Y:\android-sdk\avd`
  and the system image under `Y:\android-sdk\system-images`.
- Both env vars must be overridden for the shell, not just `ANDROID_AVD_HOME`.
  The emulator resolves the AVD's `image.sysdir.1` through `ANDROID_HOME`, which
  takes precedence over `ANDROID_SDK_ROOT`, and the user-wide `Y:\Android\Sdk`
  has no `system-images` — so the launch dies with "Broken AVD system path"
  unless both point at `Y:\android-sdk`. The AVD is also outside the default
  `%USERPROFILE%\.android\avd`, so `ANDROID_AVD_HOME` is needed too:
  `$env:ANDROID_HOME = 'Y:\android-sdk'; $env:ANDROID_SDK_ROOT = 'Y:\android-sdk'; $env:ANDROID_AVD_HOME = 'Y:\android-sdk\avd'; Y:\android-sdk\emulator\emulator.exe -avd agent-avd -no-window -no-audio -no-boot-anim -gpu host`
  A visible window is the same command without the `-no-window` flags. Boot
  takes about a minute; wait for `adb shell getprop sys.boot_completed` to print
  `1` before interacting, rather than sleeping a fixed time. `expo run:android`
  inherits these, so run it from the same shell.
- **Always launch with `-gpu host` (the host GPU).** `-gpu swiftshader_indirect`
  rasterizes everything on the CPU and makes the whole app feel laggy — measured
  on this machine as 64.6% janky frames and a 4950 ms 90th-percentile GPU time,
  versus 12.7% janky and 19 ms with `host`. The AVD's own `config.ini` must also
  say `hw.gpu.enabled = yes` and `hw.gpu.mode = host`; a stale `no`/`auto` there
  silently forces software rendering even when the flag says `host`. Confirm the
  renderer actually took effect before blaming the app:
  `adb shell dumpsys SurfaceFlinger | findstr GLES:` must name the host GPU
  (e.g. `NVIDIA GeForce RTX 4050`), not `Google SwiftShader`. Measure frames with
  `adb shell dumpsys gfxinfo sh.waku.mobile` (`reset` first); the emulator's
  `swiftshader` fallback is the first thing to rule out on any "it's laggy"
  report. `emu.cmd` at the repo root encodes all of this.
- `adb` is `Y:\android-sdk\platform-tools\adb.exe`; `sdkmanager` and
  `avdmanager` are under `Y:\android-sdk\cmdline-tools\latest\bin`. Kill the
  emulator process when finished — it does not exit on its own.
- Use it to install and exercise `apps/mobile` builds when a task needs a real
  device surface; a successful JS/Rust build alone is not validation.

### Running the mobile app end to end

The debug APK has no embedded JS bundle, so an emulator alone is not enough —
without a reachable Metro server the app boots to a red "Unable to load
script" screen. Run all four steps:

1. Emulator, headless: run `emu.cmd` (or the command above), then wait for
   `adb shell getprop sys.boot_completed` to print `1`.
2. Metro, from `apps/mobile`: `bun x expo start --port 8081`. It is ready when
   `Test-NetConnection 127.0.0.1 -Port 8081` is `True`; the log prints
   `Waiting on http://localhost:8081`. Logs land in `%TEMP%\waku-metro.log`
   when started detached.
3. Bridge the emulator to Metro: `adb reverse tcp:8081 tcp:8081`. The app's
   debug build loads `index.android.bundle` from `localhost:8081`, and without
   the reverse it cannot see the host's Metro.
4. Launch: `adb shell am force-stop sh.waku.mobile` then
   `adb shell monkey -p sh.waku.mobile -c android.intent.category.LAUNCHER 1`.
   First bundle takes ~1s; verify with `adb exec-out screencap -p` (the New Task
   screen) and `adb shell dumpsys window | findstr mCurrentFocus`.
   `bun --filter @waku/mobile android` (`expo run:android`) does steps 2-4 in
   one shot and handles `adb reverse` itself, so prefer it when a rebuild is
   also needed.
- `adb shell am force-stop` + relaunch is enough to pick up JS changes; a full
  `expo run:android` is only needed after native/config changes.

## Releasing

The full procedure is [RELEASING.md](RELEASING.md). The parts that have gone
wrong before, and must not be skipped:

- **PR → green checks → squash merge.** `test.yml` runs on `pull_request` only,
  so a merge into `main` runs nothing. The PR is the only place a change is
  tested; never merge one with a red or in-progress check.
- **The version bump is its own commit**, and it touches **five** files:
  `Cargo.toml`, `Cargo.lock`, `CHANGELOG.md`, `apps/mobile/app.json`, and
  `apps/mobile/android/app/build.gradle`. The two mobile files are the ones
  that get forgotten, and each has a user-visible failure: `app.json` is what
  Settings displays, and `build.gradle`'s `versionCode` is what the Android
  updater compares against.
- **`versionCode` must strictly increase every release.** The Android app only
  offers an update when the manifest's number is greater than the installed
  build's, so a repeated value ships a release nobody is ever told about.
- **A release run skips itself if that version is already published.** Bumping
  is what makes a dispatch do anything.
- **The release lands as a draft.** Publishing is a manual step; nothing reaches
  users until it is done.

## Accessibility

- Treat accessibility as a product requirement too. GPUI does not yet expose a
  screen-reader tree, so here it means keyboard operability, honored system
  settings, and legibility — none of which depend on that missing API, and all
  of which regress silently if left unchecked.
- Every control reachable by mouse must be reachable and operable by keyboard.
  Use `track_focus` with `tab_index`, `tab_group`, and `tab_stop`, give focus a
  visible treatment via `focus_visible`, and support the conventional keys for
  the widget (arrows, `home`/`end`, `enter`/`space`, `escape`).
- Honor the system's reduce-motion setting. `with_animation` already respects
  `App::reduce_motion`, but a direct `window.request_animation_frame` for
  decorative motion must check `cx.reduce_motion()` and skip the request.
- Never encode meaning in color, hover, or motion alone. Pair a status color
  with an icon or text, and make sure anything revealed on hover is also
  reachable by keyboard focus.
- Keep text and icons legible against their surface in both themes, and give
  interactive targets enough hit area — extend the hit region rather than
  shrinking to the glyph.

## Product reference

- Use [T3 Code](https://github.com/pingdotgg/t3code) source code on github as a reference when a task
  concerns coding-agent workflow, information hierarchy, controls, tool
  activity, or transcript presentation and the comparison would materially
  clarify an ambiguous product decision, or when the user explicitly asks for
  the comparison.
- Do not inspect T3 Code for localized bug fixes, straightforward visual
  corrections, native platform behavior, or changes already specified clearly
  by the user. When T3 Code is relevant, inspect its current app or source
  rather than relying on an older screenshot or memory.
- Use [Zed](https://github.com/zed-industries/zed) source code as a reference
  when a task concerns GPUI implementation — layout and styling idioms, focus
  and key dispatch, virtualized lists, menus and popovers, window and platform
  behavior — or when an in-house `src/ui` primitive needs a proven native
  precedent. Zed is the canonical GPUI codebase; read its crates rather than
  `gpui-component`, and read the gpui revision pinned in `Cargo.toml` so the
  APIs match what Kerenzikov builds against.
- Split the two references by concern: T3 Code answers what a coding-agent
  client should do, Zed answers how a polished GPUI app implements it. The
  same restraint applies to both — no reference spelunking for localized
  fixes or changes the user has already specified.
- Use the reference as behavioral and design evidence, not as an instruction to
  reproduce web-specific interaction patterns or known bugs. Kerenzikov should keep
  native macOS conventions.
- Explicit user screenshots and feedback override a previous or merely
  "consistent" treatment.
- For provider-native content such as citations, reasoning, and tool events,
  verify the real provider payload and preserve its ordering. Never expose
  private provider control markers in the transcript.
- Validate visible changes in the freshly rebuilt, signed app managed by the
  dev watcher against the exact provider interaction; a successful Rust build
  alone is insufficient.
