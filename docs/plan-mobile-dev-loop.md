# Plan: make the mobile inner loop fast

Status: shipped as `scripts/mobile.ts` (#39). Owner: yaffalhakim1.

## The problem

Desktop development is a tight loop: `bun ./scripts/dev.ts` watches, rebuilds,
signs, relaunches. Mobile has no equivalent. The four manual steps in
`AGENTS.md` ("Running the mobile app end to end") exist because the pieces are
unwired, and the failure modes are all silent:

| Symptom | Actual cause |
|---|---|
| Red "Unable to load script" screen | Debug APK has no embedded bundle and Metro is not running |
| Bundle loads, daemon never connects | `adb reverse tcp:8081` missing after an emulator restart |
| Nothing updates after an edit | Metro cached a failed transform and is serving its last good bundle; `expo run:android` has no `--clear`, so delete `$env:TEMP\metro-cache` |
| "It's laggy" | Emulator fell back to SwiftShader |

Measured on this machine, the pieces cost:

| Step | Measured |
|---|---|
| Emulator boot (cold, `-gpu host`) | ~60 s |
| Metro cold start | ~10 s |
| JS-only reload (`force-stop` → first frame) | **2.3 s** |
| Native rebuild (`expo run:android`) | minutes |

So the loop people actually feel is the 2.3 s reload — but only once the
emulator, Metro and the reverse tunnel are all already up. Everything else is
setup that has to be remembered and re-done.

## Decision

Add `scripts/mobile.ts` — a sibling of `dev.ts` that owns the whole mobile
loop and is safe to re-run. It follows `dev.ts`'s conventions: idempotent,
prints what it did, never starts a second copy of something already running.

### Scope (one PR)

1. **Emulator.** Reuse the logic already encoded in `emu.cmd` (both SDK env
   vars, `ANDROID_AVD_HOME`, `-gpu host`), but run headless by default with a
   `--window` flag. Wait on `getprop sys.boot_completed`, not a fixed sleep.
2. **Metro.** Start detached, log to `%TEMP%\waku-metro.log`, wait for the port
   to accept, and refuse to start a second instance if 8081 is already listening.
3. **Reverse tunnel.** `adb reverse tcp:8081 tcp:8081`, re-asserted after every
   emulator start — this is the step that silently breaks and costs the most
   time to diagnose.
4. **Launch.** `am force-stop` then `monkey` (the 2.3 s JS path), with a
   `--native` flag that runs `bun --filter @waku/mobile android` when native
   code or config changed.
5. **Verify.** Assert the renderer is the host GPU
   (`dumpsys SurfaceFlinger | findstr GLES:` must not say `SwiftShader`) and
   fail loudly if it is. This is the check that turns "it's laggy" into a
   one-line answer.

### Explicitly out of scope

- A JS-side file watcher. Metro already has one; re-implementing it adds a
  second source of truth for "what is stale".
- EAS / cloud builds. Not the inner loop.
- Making `dev.ts` mobile-aware. Desktop and mobile loops have different
  lifecycles; sharing a script would couple them for no benefit.

### Non-goals worth stating

- This does not make the emulator fast. It makes the *setup* reliable and the
  *diagnosis* immediate. The 2.3 s reload is already good; the wins are the
  eliminated silent failures.

## Risks

| Risk | Mitigation |
|---|---|
| Script starts a second emulator/Metro | Port + `adb devices` checks before every start, as `emu.cmd` already does |
| Headless default surprises someone expecting a window | Print the visible-window command on start; `--window` flag |
| `-gpu host` fails on another machine | Keep the documented `swiftshader_indirect` fallback, but warn rather than silently continue |
| Duplicating `emu.cmd` | `emu.cmd` stays the zero-dependency path for a fresh Windows box; `mobile.ts` is the daily driver. Note the relationship in both files. |

## Verification

- Cold run (nothing up): emulator, Metro, tunnel, launch, and a GPU assertion
  all succeed from one command.
- Warm run (everything up): re-running changes nothing and does not restart
  Metro or the emulator.
- Edit a `.tsx` file: `force-stop` + relaunch picks it up without a rebuild.