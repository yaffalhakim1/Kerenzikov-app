#!/usr/bin/env bun
//
// Move every version site to one number, via `scripts/version-sites.ts`.
//
// Usage:
//   bun run version:bump 0.1.51     # write 0.1.51 everywhere, then verify
//   bun run version:bump --check    # verify the tree agrees, change nothing
//
// This replaces the hand-edited bump commit. `Cargo.toml` is the source of
// truth; everything else is a consumer, and the mobile pair is what used to
// drift: `app.json` made Settings display an old version, and a frozen
// `versionCode` meant installed Android builds were never offered an update.
//
// The lockfile is updated by cargo rather than by a regex: it is a generated
// file with checksums, and the only correct writer is the tool that owns it.
import {
  checkSites,
  formatReports,
  readCargoVersion,
  readLockVersion,
  writeVersion,
} from "./version-sites.ts";

const BUN = process.execPath;

async function run(args: string[], label: string): Promise<void> {
  const proc = Bun.spawn(args, { stdout: "inherit", stderr: "inherit" });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`${label} failed with exit code ${code}`);
  }
}

async function check(version: string): Promise<void> {
  const reports = await checkSites(version);
  const ok = reports.every((r) => r.ok);
  (ok ? console.log : console.error)(formatReports(version, reports));
  if (!ok) process.exit(1);
}

if (import.meta.main) {
  const argv = process.argv.slice(2);

  if (argv[0] === "--check" || argv.length === 0) {
    await check(await readCargoVersion());
    process.exit(0);
  }

  const target = argv[0]!;
  // A typo in the destination is the one mistake this script cannot recover
  // from by itself: it would move every site to a version no tag will match.
  if (!/^\d+\.\d+\.\d+$/.test(target)) {
    console.error(`Not a x.y.z version: ${target}`);
    process.exit(1);
  }

  const current = await readCargoVersion();
  if (target === current) {
    console.log(`Already at ${target}; checking the other sites.`);
    await check(current);
    process.exit(0);
  }

  const cargoPath = "Cargo.toml";
  const text = await Bun.file(cargoPath).text();
  if (!/^version = ".*"$/m.test(text)) {
    console.error("No version line in Cargo.toml");
    process.exit(1);
  }
  const next = text.replace(/^version = ".*"$/m, `version = "${target}"`);
  await Bun.write(cargoPath, next);
  console.log(`Cargo.toml -> ${target}`);

  for (const site of ["apps/mobile/app.json", "apps/mobile/android/app/build.gradle"]) {
    if (await Bun.file(site).exists()) continue;
    console.error(`Missing ${site}; the mobile version sites moved. Update this script.`);
    process.exit(1);
  }
  const { written } = await writeVersion(target);
  for (const site of written) console.log(`wrote ${site}`);

  // `cargo update -p waku --precise` rewrites the lockfile entry the release
  // workflow builds against, without disturbing anything else in it.
  await run(["cargo", "update", "--workspace", "-p", "waku", "--precise", target], "cargo update");

  const lock = await readLockVersion();
  if (lock !== target) {
    // A workspace root with no registry entry cannot always be pinned this
    // way; the version line is enough for `--locked` and is written directly.
    console.warn(`Cargo.lock still says ${lock}; pinning the entry directly.`);
    const raw = await Bun.file("Cargo.lock").text();
    const patched = raw.replace(
      /(\[\[package\]\]\nname = "waku"\nversion = ")[^"]*(")/,
      `$1${target}$2`,
    );
    if (patched === raw) {
      console.error('Cargo.lock has no `name = "waku"` entry to update.');
      process.exit(1);
    }
    await Bun.write("Cargo.lock", patched);
  }

  // `cargo update` can pull Cargo.toml back from the registry manifest of a
  // published crate of the same name; make sure the bump survived it.
  const after = await readCargoVersion();
  if (after !== target) {
    const current2 = await Bun.file(cargoPath).text();
    await Bun.write(cargoPath, current2.replace(/^version = ".*"$/m, `version = "${target}"`));
  }

  console.log("\nNow write the CHANGELOG section, then verify:");
  console.log(`  bun run version:bump --check`);
  console.log(`  bun run test:mobile`);
  console.log(`  cargo check --locked -p waku-core`);
  console.log(`  git add -A && git commit -m "chore: bump version to ${target}"`);
  void BUN;
}
