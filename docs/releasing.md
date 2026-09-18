# Releasing Kerenzikov

How a change reaches users: the workflows involved, what each one does, and the
order that keeps a release from half-publishing.

## The two workflows

| Workflow | File | Fires on | Does |
| --- | --- | --- | --- |
| Tests | `.github/workflows/test.yml` | every PR, and pushes to `main` | Path-filtered checks; builds nothing |
| Release | `.github/workflows/release.yml` | a `v*` **tag** push, or manual dispatch | Builds every platform, drafts the GitHub release, uploads to R2 |

They are independent. Merging to `main` runs Tests and **nothing else** — no
release is ever produced by a merge. The tag is the only trigger.

`sync-release.yml` is a third, manual-only workflow. The release workflow
uploads to R2 itself, so `sync-release.yml` exists purely to re-sync a release
whose upload failed. You will not normally run it.

## Tests: path-filtered jobs

`test.yml` starts with a `changes` job using `dorny/paths-filter`. Three jobs
are gated on what the diff touches, so a docs change runs nothing and a
mobile-only change skips the 3-OS Rust matrix.

| Job | Runs when the diff touches |
| --- | --- |
| `rust` | `src/**`, `crates/**`, `Cargo.toml`, `Cargo.lock`, `build.rs`, `.cargo/**`, `locales/**` |
| `client` | `packages/waku-client/**`, `scripts/**`, `bun.lock` |
| `mobile` | `apps/mobile/**`, `packages/waku-client/**`, `scripts/**`, `bun.lock` |

Two consequences worth knowing:

- **A `Cargo.toml` change pulls in the full Rust matrix**, which is why the
  version bump is the expensive commit, not the feature commits.
- **`apps/web` is not covered by any CI job.** Its tests only run locally via
  `bun test`. A failure there will never block a PR.

Run the same checks locally before opening a PR:

```sh
bun install --frozen-lockfile
bun run protocol:check
bun run --filter @waku/client check
bun run --filter @waku/client test
bun run --filter @waku/mobile typecheck
bun run --filter @waku/mobile test
```

## Release: bump, push, tag

The version in `Cargo.toml` is the source of truth. The release workflow
**validates the tag against it and exits 1 on a mismatch**, so the sequence has
to be exactly this:

```sh
# 1. Bump the version. Cargo.lock moves with it.
#    Edit Cargo.toml and the [[package]] name = "waku" entry in Cargo.lock,
#    then add a matching `## [<version>]` section to the top of CHANGELOG.md.

# 2. Commit and push the bump to main.
git add Cargo.toml Cargo.lock CHANGELOG.md
git commit -m "chore: bump version to 0.1.36"
git push origin main

# 3. Tag that commit and push the tag. This is what fires the release.
git tag -a v0.1.36 -m "Kerenzikov v0.1.36"
git push origin v0.1.36
```

Tag the bump commit, not a later one. A tag whose version disagrees with
`Cargo.toml` fails in the `version` job before anything is built.

### What the release workflow does

1. **`version`** — reads `Cargo.toml`, checks the tag matches, and skips the
   whole run if a *published* release already exists for that tag. Drafts do
   not count, so re-running over a failed attempt reuses them.
2. **`windows-x86_64`**, **`windows-arm64`**, and **`android-apk`** — build in
   parallel. Windows takes ~90 minutes, Android ~60.
3. **`draft`** — writes `latest-windows.txt`, generates the mobile manifest,
   signs the Windows appcasts, uploads installers and feeds to R2, then creates
   a **draft** GitHub release.

This workflow ships **Windows and Android only**. There is no macOS or Linux
job: `release.yml` has four build jobs and neither is among them, even though
macOS and Linux updater implementations exist in the Rust source. Those
platforms are built by hand, if at all.

The release lands as a draft. **You still have to publish it by hand** — it is
not live to users until you do. That is the one manual step in the flow.

## What gets published, and where

| Artifact | Goes to | Notes |
| --- | --- | --- |
| `Kerenzikov-<v>-<arch>-Setup.exe`, `.zip` | R2 + release | Cache 1 year, immutable |
| `appcast-windows-*.xml`, `latest-windows.txt` | R2 + release | Cache 5 min |
| `Kerenzikov-<v>-universal.apk` | release only | One APK, both ABIs |
| `apps/mobile/mobile-latest.json` | **committed to main** | See below |

The Windows updater reads its appcast from R2 (`pub-a8392f3fe55a424497fe5174b0179915.r2.dev`),
and `SPARKLE_PRIVATE_KEY` signs each one. Windows binaries are packaged
**unsigned** — `WINDOWS_CERTIFICATE` is not configured in this fork, and
`bundle-windows.ts` says so and continues rather than failing.

### The mobile manifest is committed, not uploaded

The Android app reads `mobile-latest.json` over `raw.githubusercontent`, so an
update offer is a **file committed to `main`**, not a bucket object. The
`draft` job writes it last, after the release exists — a manifest that landed
first would point every installed app at a URL that 404s. It arrives as its own
commit:

```
chore(mobile): publish update manifest for v0.1.36
```

Do not edit that file by hand. It is generated from the assembled APK so its
URL and byte count describe the binary actually uploaded.

## Gotchas

**Tag without bumping, or bump without tagging.** The tag must equal
`Cargo.toml`. One without the other either does nothing or fails the `version`
job.

**`versionCode` is edited by hand and does not track `Cargo.toml`.** The
Android updater offers an update only when `manifest.versionCode` is *greater*
than the installed build's (`apps/mobile/src/lib/app-update.ts:85`), so a
release that reuses the previous `versionCode` is published but never offered
to anyone already on it. `versionCode` lives in
`apps/mobile/android/app/build.gradle` and must be bumped for every release
that should reach installed apps. `versionName` in that file and `version` in
`apps/mobile/app.json` are manual for the same reason.

**Two `patchedDependencies` sources.** A new patch needs entries in both
`package.json` and `bun.lock`. Editing only `package.json` leaves CI installing
the unpatched package.

**`bun install --force` fails locally** at `expo-libghostty`'s native
postinstall. Plain `bun install` is fine. To force one package to reinstall,
delete its directory in `node_modules` rather than running `--force`.

**Never `git push -u` a fresh branch.** The checkout's upstream is
`origin/main`, so an unqualified `-u` push targets main. Push explicitly:

```sh
git push origin <branch>:<branch> --set-upstream
```
