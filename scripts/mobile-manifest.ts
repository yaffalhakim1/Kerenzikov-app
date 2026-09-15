#!/usr/bin/env bun
//
// Write `mobile-latest.json`, the release manifest the Kerenzikov Android app
// reads to learn whether a newer build exists.
//
// Usage:
//   bun scripts/mobile-manifest.ts <assets-dir> <versionCode> <versionName>
//
// The Android updater is deliberately dumber than the desktop one: it compares
// an integer build number, then hands the download to the browser so Android's
// own installer takes over. Nothing here is signed — the app downloads a public
// artifact over HTTPS and the user confirms the install, so there is no
// unattended path to protect the way the desktop appcast needs it.
//
// The APK name is derived, not passed, so a release cannot ship a manifest that
// points at a file the build never produced.
//
// Env:
//   WAKU_MOBILE_RELEASE_BASE   base URL for release assets (must end in /)
//   WAKU_MOBILE_APK            exact APK filename in <assets-dir>
import { existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dir, "..");

/** Where tagged release assets live. GitHub puts the tag in the path, so the
 *  download URL is assembled rather than a flat prefix concatenated with a
 *  filename — the earlier flat form silently produced a 404 because the
 *  version segment was missing. */
export const defaultReleaseBase =
  "https://github.com/yaffalhakim1/Kerenzikov-app/releases/download";

/** The `v`-prefixed tag a version publishes under, matching release.yml. */
export function releaseTag(version: string): string {
  return `v${version}`;
}

export const manifestName = "mobile-latest.json";

export interface MobileManifest {
  versionCode: number;
  versionName: string;
  url: string;
  length: number;
  notes?: string;
  pubDate: string;
}

/** The APK a release ships. release.yml renames Gradle's generic output to
 *  exactly this, so the two must agree or the manifest points at nothing. */
export function apkName(version: string): string {
  return `Kerenzikov-${version}-universal.apk`;
}

/** The public URL of a release's APK. */
export function apkUrl(base: string, version: string, apk: string): string {
  return `${base.replace(/\/$/, "")}/${releaseTag(version)}/${apk}`;
}

export function renderManifest(manifest: MobileManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export async function writeMobileManifest(
  assetsDir: string,
  versionCode: number,
  versionName: string,
  releaseBase: string,
  options: { apk?: string; notes?: string; pubDate: string },
): Promise<string> {
  if (!Number.isInteger(versionCode) || versionCode < 1) {
    throw new Error(`versionCode must be a positive integer, got ${versionCode}`);
  }
  const apk = options.apk ?? apkName(versionName);
  const path = join(assetsDir, apk);
  if (!existsSync(path)) {
    throw new Error(`No ${apk} in ${assetsDir}; nothing to point the manifest at.`);
  }

  const manifest: MobileManifest = {
    versionCode,
    versionName,
    url: apkUrl(releaseBase, versionName, apk),
    length: statSync(path).size,
    ...(options.notes ? { notes: options.notes } : {}),
    pubDate: options.pubDate,
  };
  const outPath = join(assetsDir, manifestName);
  await Bun.write(outPath, renderManifest(manifest));
  console.log(`Wrote ${outPath} (build ${versionCode}, ${manifest.length} bytes)`);
  return outPath;
}

if (import.meta.main) {
  const [assetsDir, versionCodeArg, versionName] = process.argv.slice(2);
  if (!assetsDir || !versionCodeArg || !versionName) {
    console.error(
      "usage: bun scripts/mobile-manifest.ts <assets-dir> <versionCode> <versionName>",
    );
    process.exit(1);
  }
  await writeMobileManifest(
    resolve(assetsDir),
    Number.parseInt(versionCodeArg, 10),
    versionName,
    process.env.WAKU_MOBILE_RELEASE_BASE ?? defaultReleaseBase,
    {
      ...(process.env.WAKU_MOBILE_APK ? { apk: process.env.WAKU_MOBILE_APK } : {}),
      pubDate: new Date().toUTCString(),
    },
  );
}
