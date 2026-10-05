#!/usr/bin/env bun
/**
 * The mobile inner loop: pick a device, ensure Metro and the tunnels, relaunch.
 *
 * Desktop has `scripts/dev.ts`, which owns watch -> rebuild -> relaunch. Mobile
 * had four manual steps in AGENTS.md instead, and every way of getting one
 * wrong produced a symptom that named none of them:
 *
 *   - red "Unable to load script"   -> Metro was not running
 *   - app loads, daemon never links -> the adb reverse tunnel was missing
 *   - an edit does nothing          -> the app kept its last bundle
 *   - "it's laggy"                  -> the emulator fell back to SwiftShader
 *
 * Works with an emulator or a physical device. An already-attached device is
 * always preferred; the emulator is only started when nothing is attached.
 *
 *   bun scripts/mobile.ts                  # use the attached device
 *   bun scripts/mobile.ts --device RRCX... # pick one explicitly
 *   bun scripts/mobile.ts --window         # start an emulator with a window
 *   bun scripts/mobile.ts --clear          # drop Metro's cache (stale bundle)
 *   bun scripts/mobile.ts --native         # expo run:android (native changed)
 *
 * `emu.cmd` stays the zero-dependency path for a fresh Windows box.
 */
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const IS_WINDOWS = process.platform === "win32";
const EXE = IS_WINDOWS ? ".exe" : "";

/** Two SDKs live on Y:. The emulator resolves the AVD's system image through
 *  ANDROID_HOME, and the user-wide one has no system-images, so the AVD install
 *  is the default here — matching emu.cmd. */
const SDK = process.env.WAKU_ANDROID_SDK ?? process.env.ANDROID_HOME ?? "Y:\\android-sdk";
const ADB = join(SDK, "platform-tools", `adb${EXE}`);
const EMULATOR = join(SDK, "emulator", `emulator${EXE}`);
const AVD = process.env.WAKU_AVD ?? "agent-avd";
const METRO_PORT = Number(process.env.WAKU_METRO_PORT ?? 8081);
/** The daemon's own port. Reversing it lets a device use 127.0.0.1:34123 as
 *  its daemon address instead of the host's LAN IP. */
const DAEMON_PORT = Number(process.env.WAKU_DAEMON_PORT ?? 34123);
const APP_ID = "sh.waku.mobile";
const METRO_LOG = join(tmpdir(), "waku-metro.log");
const METRO_CACHE = join(tmpdir(), "metro-cache");

const argv = process.argv.slice(2);
const flags = new Set(argv);
const showWindow = flags.has("--window");
const useNative = flags.has("--native");
const clearCache = flags.has("--clear");
const allowSoftware = flags.has("--allow-software-gpu");
const explicitDevice = valueAfter("--device") ?? process.env.ANDROID_SERIAL ?? null;

function valueAfter(name: string): string | null {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] ?? null : null;
}

if (flags.has("--help") || flags.has("-h")) {
  console.log(
    [
      "Usage: bun scripts/mobile.ts [--device SERIAL] [--window] [--clear] [--native]",
      "",
      "  --device SERIAL        target a specific attached device or emulator",
      "  --window               start an emulator window (default: headless)",
      "  --clear                delete Metro's cache before starting it",
      "  --native               rebuild via expo run:android instead of relaunching",
      "  --allow-software-gpu   do not fail when an emulator renders on SwiftShader",
    ].join("\n"),
  );
  process.exit(0);
}

/** The env the emulator and adb need. ANDROID_AVD_HOME is required because the
 *  AVD lives outside %USERPROFILE%\.android\avd. */
const SDK_ENV = {
  ANDROID_HOME: SDK,
  ANDROID_SDK_ROOT: SDK,
  ANDROID_AVD_HOME: join(SDK, "avd"),
};

interface Device {
  serial: string;
  /** Emulators boot, fall back to software rendering, and need a boot wait;
   *  a physical device needs none of that. */
  kind: "emulator" | "physical";
  model: string;
}

function run(cmd: string[], log?: string): { code: number; out: string } {
  const proc = Bun.spawnSync({
    cmd,
    env: { ...process.env, ...SDK_ENV },
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = `${proc.stdout?.toString() ?? ""}${proc.stderr?.toString() ?? ""}`;
  if (log) Bun.write(log, out).catch(() => {});
  return { code: proc.exitCode ?? 0, out };
}

function spawnDetached(cmd: string[], logPath?: string): void {
  // Bun.spawn rejects sinks in stdout/stderr: they must be "pipe", "ignore",
  // or a file descriptor number. When a log is wanted, the pipes are drained
  // into it asynchronously so the child's output cannot back up.
  const proc = Bun.spawn(cmd, {
    env: { ...process.env, ...SDK_ENV },
    stdin: "ignore",
    stdout: logPath ? "pipe" : "ignore",
    stderr: logPath ? "pipe" : "ignore",
    detached: true,
  });
  proc.unref();
  if (logPath) {
    void Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]).then(([out, err]) => Bun.write(logPath, `${out}${err}`).catch(() => {}));
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function devices(): Device[] {
  const { out } = run([ADB, "devices", "-l"]);
  const found: Device[] = [];
  for (const line of out.split("\n")) {
    const match = line.trim().match(/^(\S+)\s+device\b(.*)$/);
    if (!match) continue;
    const serial = match[1]!;
    const rest = match[2] ?? "";
    const model = rest.match(/model:(\S+)/)?.[1] ?? serial;
    found.push({
      serial,
      kind: /^emulator-/.test(serial) ? "emulator" : "physical",
      model,
    });
  }
  return found;
}

/** An attached device always wins over starting an emulator: a phone is
 *  deliberate, and a stray emulator boot costs a minute. */
function selectDevice(): Device | null {
  const attached = devices();
  if (explicitDevice) {
    const chosen = attached.find((device) => device.serial === explicitDevice);
    if (!chosen) {
      throw new Error(
        `device ${explicitDevice} is not attached; found: ` +
          (attached.map((device) => device.serial).join(", ") || "none"),
      );
    }
    return chosen;
  }
  return attached.find((device) => device.kind === "physical")
    ?? attached.find((device) => device.kind === "emulator")
    ?? null;
}

function startEmulator(): void {
  if (!existsSync(EMULATOR)) {
    throw new Error(
      `nothing is attached and there is no emulator at ${EMULATOR}; ` +
        `plug in a device or set WAKU_ANDROID_SDK`,
    );
  }
  console.log(`device: starting ${AVD} (${showWindow ? "windowed" : "headless"})`);
  // -gpu host renders on the host GPU. swiftshader_indirect rasterizes on the
  // CPU and is what "the app is laggy" usually turns out to be.
  const args = ["-avd", AVD, "-no-audio", "-no-boot-anim", "-gpu", "host"];
  if (!showWindow) args.push("-no-window");
  spawnDetached([EMULATOR, ...args]);
}

async function waitForBoot(serial: string): Promise<void> {
  const deadline = Date.now() + 180_000;
  process.stdout.write("device: waiting for boot");
  while (Date.now() < deadline) {
    const { out } = run([ADB, "-s", serial, "shell", "getprop", "sys.boot_completed"]);
    if (out.includes("1")) {
      console.log(" ready");
      return;
    }
    process.stdout.write(".");
    await sleep(3_000);
  }
  console.log("");
  throw new Error("emulator did not finish booting within 180s");
}

async function metroRunning(): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${METRO_PORT}/status`, {
      signal: AbortSignal.timeout(1_500),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureMetro(): Promise<void> {
  if (await metroRunning()) {
    console.log(`metro: already listening on ${METRO_PORT}`);
    return;
  }
  if (clearCache && existsSync(METRO_CACHE)) {
    // A failed transform leaves Metro serving its last good bundle, so the app
    // silently runs stale code. Deleting the cache is the fix.
    rmSync(METRO_CACHE, { recursive: true, force: true });
    console.log("metro: cleared transform cache");
  }
  console.log(`metro: starting, logging to ${METRO_LOG}`);
  spawnDetached(["bun", "x", "expo", "start", "--port", String(METRO_PORT)], METRO_LOG);
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (await metroRunning()) {
      console.log(`metro: ready on ${METRO_PORT}`);
      return;
    }
    await sleep(1_000);
  }
  throw new Error(`Metro did not come up on ${METRO_PORT}; see ${METRO_LOG}`);
}

function reverseTunnels(serial: string): void {
  // Re-asserted every run: these silently break after a device reconnect, and
  // the symptoms (no JS, no daemon) name neither.
  run([ADB, "-s", serial, "reverse", `tcp:${METRO_PORT}`, `tcp:${METRO_PORT}`]);
  console.log(`tunnel: adb reverse tcp:${METRO_PORT} (JS bundle)`);
  run([ADB, "-s", serial, "reverse", `tcp:${DAEMON_PORT}`, `tcp:${DAEMON_PORT}`]);
  console.log(
    `tunnel: adb reverse tcp:${DAEMON_PORT} (daemon, so 127.0.0.1:${DAEMON_PORT} works on the device)`,
  );
}

function assertHostGpu(serial: string): void {
  const { out } = run([ADB, "-s", serial, "shell", "dumpsys", "SurfaceFlinger"]);
  const renderer = out.split("\n").find((line) => line.includes("GLES:"))?.trim();
  if (!renderer) {
    console.log("gpu: could not read the renderer; skipping check");
    return;
  }
  if (/swiftshader/i.test(renderer)) {
    if (allowSoftware) {
      console.log(`gpu: WARNING software rendering (${renderer})`);
      return;
    }
    throw new Error(
      "the emulator is rendering on SwiftShader, which makes the app feel slow:\n" +
        `  ${renderer}\n` +
        "Restart it with -gpu host (check hw.gpu.enabled=yes in the AVD config.ini),\n" +
        "or pass --allow-software-gpu to continue anyway.",
    );
  }
  console.log(`gpu: ${renderer}`);
}

function assertDebuggableApp(serial: string): void {
  // A release APK carries its JS bundle inside and never reads Metro, so the
  // JS-only loop silently does nothing on it: the app relaunches and shows
  // exactly the code it shipped with. That was indistinguishable from
  // "the fix didn't work". Fail here, naming the actual problem.
  const { out } = run([ADB, "-s", serial, "shell", "dumpsys", "package", APP_ID]);
  const flags = out.match(/pkgFlags=\[([^\]]*)\]/)?.[1] ?? "";
  if (!/\bDEBUGGABLE\b/.test(flags)) {
    throw new Error(
      `the installed ${APP_ID} on ${serial} is a release build (pkgFlags=[${flags.trim()}]); ` +
      "it has the JS bundle embedded and will never read Metro. Install the debug " +
      'build first: cd apps/mobile/android && cmd /c "gradlew.bat assembleDebug" && ' +
      `${ADB} -s ${serial} install -r app/build/outputs/apk/debug/app-debug.apk`,
    );
  }
}

function relaunchApp(serial: string): void {
  assertDebuggableApp(serial);
  run([ADB, "-s", serial, "shell", "am", "force-stop", APP_ID]);
  run([
    ADB, "-s", serial, "shell", "monkey",
    "-p", APP_ID, "-c", "android.intent.category.LAUNCHER", "1",
  ]);
  console.log("app: relaunched (JS-only path, no rebuild)");
}

function reportDaemonAddress(device: Device): void {
  const { out } = run([ADB, "-s", device.serial, "reverse", "--list"]);
  if (!out.includes(`tcp:${DAEMON_PORT}`)) return;
  console.log(
    `\ndaemon address for this ${device.kind}: 127.0.0.1:${DAEMON_PORT}` +
      "\n  (reversed to this host; the LAN IP also works if the device is on the same network)",
  );
}

async function main(): Promise<void> {
  let device = selectDevice();
  if (!device) {
    startEmulator();
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline && !device) {
      await sleep(2_000);
      device = selectDevice();
    }
    if (!device) throw new Error("the emulator never appeared in `adb devices`");
  }

  console.log(`device: ${device.serial} (${device.kind}, ${device.model})`);
  if (device.kind === "emulator") {
    await waitForBoot(device.serial);
    assertHostGpu(device.serial);
  } else {
    // The host GPU check only means something for an emulator.
    console.log("gpu: physical device, skipping the emulator GPU check");
  }

  await ensureMetro();
  reverseTunnels(device.serial);

  if (useNative) {
    console.log("app: expo run:android (native rebuild)");
    const result = run([
      "bun", "--filter", "@waku/mobile", "android", "--", "-d", device.serial,
    ]);
    process.stdout.write(result.out);
    if (result.code !== 0) throw new Error("expo run:android failed");
  } else {
    relaunchApp(device.serial);
  }

  reportDaemonAddress(device);
  console.log("\nready.");
}

main().catch((error: unknown) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});