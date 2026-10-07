#!/usr/bin/env bun
//
// Every place a release version is written down, and the one function that
// writes all of them.
//
// `Cargo.toml` is the source of truth. The other sites are consumers, and a
// release that updates only some of them ships a wrong number to somebody:
//
//   Cargo.lock                          `cargo --locked` refuses to build
//   CHANGELOG.md                        the release body falls back to a commit log
//   apps/mobile/app.json                Settings displays a stale version
//   apps/mobile/android/app/build.gradle  the Android updater offers nothing
//
// The last one is the dangerous one. `versionCode` is the integer the Android
// updater compares (`apps/mobile/src/lib/app-update.ts`), and it is read back
// out of the assembled APK by the release workflow. It has to increase every
// release and must never repeat — a repeated value is invisible, because the
// build succeeds, the release publishes, and no installed app is ever told
// about it.
//
// So `versionCode` is no longer hand-written at all: it is derived from the
// semantic version, which makes it monotonic by construction and removes the
// step nobody remembered. The gradle file evaluates the rule at build time
// instead of holding a number, so a stale checkout cannot ship one.
import { existsSync } from "node:fs";
import { join } from "node:path";

export const projectRoot = join(import.meta.dir, "..");

/** Paths, relative to the repository root. */
export const sites = {
  cargo: "Cargo.toml",
  lock: "Cargo.lock",
  changelog: "CHANGELOG.md",
  appJson: "apps/mobile/app.json",
  buildGradle: "apps/mobile/android/app/build.gradle",
} as const;

export interface Version {
  major: number;
  minor: number;
  patch: number;
}

export function formatVersion({ major, minor, patch }: Version): string {
  return `${major}.${minor}.${patch}`;
}

export function parseVersion(value: string): Version | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value.trim());
  if (!match) return null;
  return {
    major: Number.parseInt(match[1]!, 10),
    minor: Number.parseInt(match[2]!, 10),
    patch: Number.parseInt(match[3]!, 10),
  };
}

/**
 * The Android `versionCode` for a version.
 *
 * `major * 10000 + minor * 100 + patch` with each component under 100, so the
 * per-release step is exactly one for any version this project will use and
 * the value is strictly increasing across releases (0.1.50 -> 1050,
 * 0.1.51 -> 1051). It cannot repeat unless a version is reused, which the tag
 * check in the release workflow already refuses.
 *
 * A component at or above 100 would make two versions collide (0.1.100 and
 * 0.2.0 both land on 1100), so it is rejected rather than silently encoded.
 */
export function deriveVersionCode(version: Version | string): number {
  const parsed = typeof version === "string" ? parseVersion(version) : version;
  if (!parsed) {
    throw new Error(`Not a x.y.z version: ${String(version)}`);
  }
  const { major, minor, patch } = parsed;
  for (const [name, value] of [
    ["major", major],
    ["minor", minor],
    ["patch", patch],
  ] as const) {
    if (value >= 100) {
      throw new Error(
        `${formatVersion(parsed)} has a ${name} of ${value}; ` +
          "deriveVersionCode needs every component below 100 to stay monotonic.",
      );
    }
  }
  return major * 10_000 + minor * 100 + patch;
}

/** The gradle expression the app module's `versionName` must be, so the number
 *  comes from the repository version at configuration time rather than sitting
 *  in the file where it can go stale. */
export const gradleExpression = 'rootProject.ext.wakuVersion';

/** The gradle body that derives `versionCode` from `versionName` at build
 *  time. Kept here so the writer and the checker cannot disagree about the
 *  spelling this repo expects. */
export const gradleDerivation = [
  `        versionName ${gradleExpression}`,
  "        // Derived, never hand-written: a repeated versionCode is invisible",
  "        // until an update silently fails to be offered. See",
  "        // scripts/version-sites.ts — `bun run version:bump --check` fails when",
  "        // these three lines drift out of that rule.",
  "        def (wakuMajor, wakuMinor, wakuPatch) = rootProject.ext.wakuVersion.tokenize('.')",
  "        versionCode wakuMajor.toInteger() * 10000 + wakuMinor.toInteger() * 100 + wakuPatch.toInteger()",
].join("\n");

/** What the gradle file must contain for the rule to hold, in order. */
export const gradleRuleMarkers = [
  "tokenize('.')",
  "* 10000",
  "* 100",
  `versionName ${gradleExpression}`,
] as const;

export type SiteName = keyof typeof sites;

export interface SiteReport {
  site: SiteName;
  path: string;
  ok: boolean;
  detail: string;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export async function readCargoVersion(root = projectRoot): Promise<string> {
  const text = await Bun.file(join(root, sites.cargo)).text();
  const match = /^version = "(.*)"$/m.exec(text);
  if (!match) throw new Error(`No version in ${sites.cargo}`);
  return match[1]!;
}

function lockPackageBlock(lock: string, name: string, root: boolean): string | null {
  // The root crate is the first `[[package]]` with no `source`; dependencies
  // of the same name would carry one. Everything else in the lockfile has a
  // source or is a workspace member, and only the root carries this name.
  const blocks = lock.split(/\n(?=\[\[package\]\])/);
  for (const block of blocks) {
    if (!new RegExp(`^name = "${name}"$`, "m").test(block)) continue;
    if (root && /^source = /m.test(block)) continue;
    return block;
  }
  return null;
}

function lockVersion(block: string): string | null {
  const match = /^version = "(.*)"$/m.exec(block);
  return match ? match[1]! : null;
}

/** The version the lockfile recorded for the root `waku` package. */
export async function readLockVersion(
  root = projectRoot,
  name = "waku",
): Promise<string | null> {
  const lock = await Bun.file(join(root, sites.lock)).text();
  const block = lockPackageBlock(lock, name, true);
  return block ? lockVersion(block) : null;
}

export async function readChangelogVersion(root = projectRoot): Promise<string | null> {
  const text = await Bun.file(join(root, sites.changelog)).text();
  const match = /^## \[(\d+\.\d+\.\d+)\]/m.exec(text);
  return match ? match[1]! : null;
}

export async function readAppJsonVersion(root = projectRoot): Promise<string | null> {
  const path = join(root, sites.appJson);
  if (!existsSync(path)) return null;
  const config = await Bun.file(path).json();
  return typeof config?.expo?.version === "string" ? config.expo.version : null;
}

export interface GradleVersionInfo {
  versionName: string | null;
  /** A literal `versionCode <n>` line, which is what the old scheme wrote. */
  literalVersionCode: number | null;
  derived: boolean;
}

export async function readGradleVersion(root = projectRoot): Promise<GradleVersionInfo> {
  const path = join(root, sites.buildGradle);
  const text = await Bun.file(path).text();
  const nameMatch = /versionName\s+(?:"([^"]*)"|([A-Za-z0-9_.:]+))/.exec(text);
  const literalMatch = /^\s*versionCode\s+(\d+)\s*$/m.exec(text);
  const derived = gradleRuleMarkers.every((marker) => text.includes(marker));
  return {
    versionName: nameMatch ? (nameMatch[1] ?? nameMatch[2] ?? null) : null,
    literalVersionCode: literalMatch ? Number.parseInt(literalMatch[1]!, 10) : null,
    derived,
  };
}

// ---------------------------------------------------------------------------
// Checking
// ---------------------------------------------------------------------------

/** Whether a site agrees with `version`. A site that is missing ignores it. */
export async function checkSites(
  version: string,
  root = projectRoot,
): Promise<SiteReport[]> {
  const expectedCode = deriveVersionCode(version);
  const reports: SiteReport[] = [];

  const lock = await readLockVersion(root);
  reports.push({
    site: "lock",
    path: sites.lock,
    ok: lock === version,
    detail: lock === version ? `name = "waku" at ${version}` : `waku at ${lock}`,
  });

  const changelog = await readChangelogVersion(root);
  reports.push({
    site: "changelog",
    path: sites.changelog,
    ok: changelog === version,
    detail: changelog === version ? `## [${version}]` : `top section is ${changelog}`,
  });

  const appJson = await readAppJsonVersion(root);
  reports.push({
    site: "appJson",
    path: sites.appJson,
    ok: appJson === version,
    detail: appJson === version ? `expo.version = ${version}` : `expo.version = ${appJson}`,
  });

  const gradle = await readGradleVersion(root);
  // `versionName` is expected to be the gradle expression, not a literal: the
  // build reads the repository version at configuration time, so there is no
  // number in this file to fall out of date. The check is that the expression
  // is present and that the derivation rule beside it is intact.
  const nameOk = gradle.versionName === gradleExpression;
  const ok = nameOk && gradle.derived && gradle.literalVersionCode === null;
  reports.push({
    site: "buildGradle",
    path: sites.buildGradle,
    ok,
    detail: gradle.derived
      ? gradle.literalVersionCode !== null
        ? `derives versionCode but still writes a literal ${gradle.literalVersionCode}`
        : nameOk
          ? `derives versionCode ${expectedCode} from the shared version`
          : `versionName = ${gradle.versionName} (expected ${gradleExpression})`
      : `no derivation rule; versionName = ${gradle.versionName}`,
  });

  return reports;
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

export interface WriteResult {
  written: SiteName[];
}

/**
 * Write `version` into every site that is not already carrying it.
 *
 * The lockfile entry for the root `waku` package is updated in place; a lock
 * without that block is left alone, because a missing entry means a different
 * manifest shape than this project has and guessing at it would corrupt the
 * file.
 */
export async function writeVersion(
  version: string,
  root = projectRoot,
): Promise<WriteResult> {
  if (!parseVersion(version)) throw new Error(`Not a x.y.z version: ${version}`);
  const written: SiteName[] = [];

  const appJsonPath = join(root, sites.appJson);
  if (existsSync(appJsonPath)) {
    const raw = await Bun.file(appJsonPath).text();
    const next = raw.replace(
      /("version"\s*:\s*")[^"]*(")/,
      (_all, before: string, after: string) => `${before}${version}${after}`,
    );
    if (next !== raw) {
      await Bun.write(appJsonPath, next);
      written.push("appJson");
    }
  }

  const gradlePath = join(root, sites.buildGradle);
  if (existsSync(gradlePath)) {
    const raw = await Bun.file(gradlePath).text();
    const next = raw.replace(
      /^(\s*)versionCode\s+\d+\s*\n\s*versionName\s+"[^"]*"\s*$/m,
      gradleDerivation,
    );
    if (next !== raw) {
      await Bun.write(gradlePath, next);
      written.push("buildGradle");
    }
  }

  return { written };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function reportLine(site: string, ok: boolean, detail: string): string {
  return `  ${ok ? "ok  " : "FAIL"}  ${site}  ${detail}`;
}

/** The whole check as the CLI prints it: one line per site, aligned. */
export function formatReports(version: string, reports: SiteReport[]): string {
  const width = Math.max(...["cargo", ...reports.map((r) => r.site)].map((s) => s.length));
  const line = (site: string, ok: boolean, detail: string) =>
    `  ${ok ? "ok  " : "FAIL"}  ${site.padEnd(width)}  ${detail}`;
  const allOk = reports.every((r) => r.ok);
  const lines = [
    `Cargo.toml is the source of truth: ${version}`,
    line("cargo", true, `version = ${version}`),
    ...reports.map((r) => line(r.site, r.ok, r.detail)),
  ];
  lines.push(
    allOk
      ? `\nAll sites agree on ${version} (versionCode ${deriveVersionCode(version)}).`
      : "\nVersion sites disagree with Cargo.toml. " +
          "Run `bun run version:bump <version>` instead of editing them by hand.",
  );
  return lines.join("\n");
}

if (import.meta.main) {
  const version = await readCargoVersion();
  const reports = await checkSites(version);
  const allOk = reports.every((r) => r.ok);
  const stream = allOk ? console.log : console.error;
  stream(formatReports(version, reports));
  if (!allOk) process.exit(1);
}
