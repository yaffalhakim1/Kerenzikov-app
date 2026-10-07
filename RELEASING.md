# Releasing Kerenzikov

This fork releases **Windows and Android** only, from GitHub Actions, as assets
on a GitHub release. Windows additionally self-updates: the app polls a signed
Sparkle-format appcast hosted in this fork's own Cloudflare R2 bucket (public
`r2.dev` URL, no custom domain) and installs newer signed `Setup.exe` builds
in place. Android has no auto-updater; users download the APK.

The release path is [`.github/workflows/release.yml`](.github/workflows/release.yml):

| Job | Runner | Produces |
| --- | --- | --- |
| `version` | ubuntu-latest | reads `version` from `Cargo.toml`, refuses a mismatched `v*` tag |
| `windows-x86_64` | windows-latest | `Kerenzikov-<version>-x86_64-Setup.exe`, `kerenzikov-<version>-x86_64-pc-windows-msvc.zip` |
| `windows-arm64` | windows-11-arm | `Kerenzikov-<version>-aarch64-Setup.exe`, `kerenzikov-<version>-aarch64-pc-windows-msvc.zip` |
| `android-apk` | ubuntu-22.04 | `Kerenzikov-<version>-universal.apk` |
| `draft-release` | ubuntu-latest | a **draft** GitHub release with all of the above, plus `latest-windows.txt` and the signed `appcast-windows-*.xml` feeds; mirrors installers + feeds to R2 |

Trigger it either way:

- **Push a `v*` tag** — the tag must match `version` in `Cargo.toml`, or the run
  fails before anything builds.
- **Actions → Release → Run workflow** — no tag needed. The run releases
  whatever `Cargo.toml` says and drafts it as `v<version>`.

The draft is never published automatically; publish it from the GitHub UI when
the artifacts look right.

## The loop

Every change follows the same five steps. Do not skip one because it looks
unnecessary — each has bitten this repo at least once.

```
1. Branch          feat/… or fix/… off a freshly-fetched main
2. PR              open it, then wait for every check to go green
3. Squash merge    gh pr merge <n> --squash --delete-branch
4. Bump            its own commit on main, bumping all five version sites
5. Release         dispatch the workflow, then publish the draft by hand
```

A merge into `main` runs **nothing** — `test.yml` is `pull_request` only, on the
theory that the branch head was already verified. So step 2 is the only place
tests run. **Never merge a red PR**, and never merge on a "the other jobs are
probably fine" basis: a skipped job means the diff did not touch that path, not
that it passed.

```sh
git fetch origin main && git checkout main && git pull --ff-only origin main
git checkout -b fix/what-is-wrong

# … work, commit …

gh pr create --base main --title "fix(scope): what changed" --body-file /tmp/body.md
gh pr checks <n> --watch          # wait for green
gh pr merge <n> --squash --delete-branch

git checkout main && git pull --ff-only origin main
```

## Step 4: the bump, and the five version sites

**This is the step that goes wrong.** `Cargo.toml` is not the only version in
the tree, and the other four do not update themselves. A release that bumps
only `Cargo.toml` ships a binary whose Settings screen reports a stale number
and — worse — an Android build the updater will never offer to anyone.

| File | Field | Who reads it | Consequence if stale |
| --- | --- | --- | --- |
| `Cargo.toml` | `version` | the release workflow, artifact names | tag mismatch fails the run |
| `Cargo.lock` | `[[package]] name = "waku"` → `version` | `cargo --locked` | build fails on a locked check |
| `CHANGELOG.md` | `## [<version>]` section | the release body | notes fall back to raw commit log |
| `apps/mobile/app.json` | `expo.version` | Settings → **Version** | the app displays an old version |
| `apps/mobile/android/app/build.gradle` | `versionCode`, `versionName` | the Android updater | **installed apps are never offered the update** |

The last two are the ones nobody remembers. Both were stale at v0.1.50:

- `app.json` sat at `0.1.45`, so Settings said "0.1.45" on a 0.1.50 build.
- `build.gradle` had `versionCode 22`, unchanged since v0.1.48. The manifest's
  `versionCode` is read back out of the assembled APK, so it was `22` too, and
  `app-update.ts` only offers an update when the manifest's number is **strictly
  greater** than the installed one. `22 <= 22` meant **0.1.49 and 0.1.50 were
  never offered to anyone already on 0.1.48 or later.**

### `versionCode` must increase every release

It is a monotonic integer, not a display string. It does not track the semver
and must never repeat. Current convention is a hand-increment:

```
versionCode 22   ->   versionCode 23
```

Check what the last release used before choosing a number, because a repeated
value is invisible: the build succeeds, the release publishes, and the update
simply never appears.

```sh
# What does main currently carry? This is the value to increment.
git fetch origin main
git show origin/main:apps/mobile/android/app/build.gradle | grep versionCode
```

Read it from `origin/main`, not from `git describe --tags`: a release's tag
points at the manifest commit the workflow pushes *after* the bump, so
`describe` from a local `main` that has not pulled that commit reports the
previous release and tells you to reuse a number.

### The bump commit

```sh
# 1. Cargo.toml + Cargo.lock + CHANGELOG.md + the two mobile files.
#    Write the CHANGELOG for the people downloading the build: what changed for
#    them, not the commit history. Fold an unreleased feature's fixes into its
#    own bullet rather than adding separate entries.

# 2. Verify the five sites agree before committing.
grep '^version' Cargo.toml
grep -A1 'name = "waku"' Cargo.lock | grep version
grep -n 'versionCode\|versionName' apps/mobile/android/app/build.gradle
grep -n '"version"' apps/mobile/app.json

# 3. Confirm the changelog section parses, or the release body silently
#    becomes the raw commit log.
bun -e "import { extractReleaseNotes } from './scripts/changelog.ts';
  const t = await Bun.file('CHANGELOG.md').text();
  console.log(extractReleaseNotes(t, '0.1.51') ?? 'NULL — would fall back');"

# 4. Confirm the lockfile still resolves.
cargo check --locked -p waku-core

git add Cargo.toml Cargo.lock CHANGELOG.md apps/mobile/app.json apps/mobile/android/app/build.gradle
git commit -m "chore: bump version to 0.1.51"
git push origin main
```

## Step 5: release and publish

Either trigger works, and they are equivalent for a version not yet published:

```sh
# No tag needed. Releases whatever Cargo.toml says, as v<version>.
gh workflow run release.yml --ref main
```

```sh
# Or tag the bump commit — the tag must equal Cargo.toml, or the `version` job
# exits 1 before anything builds.
git tag -a v0.1.51 -m "Kerenzikov v0.1.51"
git push origin v0.1.51
```

A run **skips every job** if that version is already published (drafts do not
count). Bumping is therefore mandatory: re-dispatching without a bump is a
no-op, not a rebuild.

Then watch it and publish:

```sh
gh run watch <run-id> --exit-status
gh release view v0.1.51 --json isDraft,assets
gh release edit v0.1.51 --draft=false      # the one manual step
```

Before publishing, check:

- All five jobs succeeded — `Resolve version`, both Windows legs, `Android APK`,
  `Draft GitHub release`.
- The release body is the CHANGELOG section, not a commit list.
- `appcast-windows-x86_64.xml` carries the new `shortVersionString` and its
  `<enclosure url>` points at this fork's `r2.dev` bucket.
- `latest-windows.txt` names the new version.

One-time caveat: builds predating the updater (no feed URL, upstream key)
never self-update and must be downloaded manually once. Every build since
trusts only this fork's key and feed.

## How the Windows auto-updater works

- Each architecture polls its own feed on launch and on Check for Updates:
  `https://pub-a8392f3fe55a424497fe5174b0179915.r2.dev/appcast-windows-<arch>.xml`
  (`FEED_URL` in `src/updater.rs`, Windows module). A newer
  `shortVersionString` than `CARGO_PKG_VERSION` means "update available".
- `scripts/appcast-windows.ts` signs each `Setup.exe` with the EdDSA private
  key in `SPARKLE_PRIVATE_KEY` and writes the per-arch feed. It refuses to run
  when that key does not derive the `SUPublicEDKey` in `resources/Info.plist`
  (exported to Rust by `build.rs` as `WAKU_SPARKLE_PUBLIC_ED_KEY`), so a key
  mismatch fails loudly instead of shipping a feed the app rejects.
- The app downloads the staged installer with `curl.exe`, checks the byte
  length, verifies the ed25519 signature strictly, then runs the installer and
  quits. Transport is untrusted by design; the signature is the trust root.
- Upload caching: `Setup.exe` files are immutable → `max-age=31536000`;
  `appcast-windows-*.xml` and `latest-windows.txt` change per release →
  `max-age=300, must-revalidate`.

### Signing

Two independent signatures exist; do not confuse them:

- **Appcast (required for updates):** `SPARKLE_PRIVATE_KEY` (base64 EdDSA key)
  signs every `Setup.exe`. Its public half is `SUPublicEDKey` in
  `resources/Info.plist`. Rotate by replacing both together — a new private
  key with the old public key (or vice versa) disables updates.
- **Authenticode (optional, SmartScreen only):** `WINDOWS_CERTIFICATE`
  (base64 `.pfx`) and `WINDOWS_CERTIFICATE_PASSWORD` sign the executables and
  the installer. Without them packaging still succeeds; first launch shows a
  SmartScreen warning. The updater does not check Authenticode.

The APK is signed with the debug keystore
(`apps/mobile/android/app/build.gradle`), which is what the release build
configures. It is not a Play Store signing key.

### The installers are per-user on purpose

`resources/windows/waku.iss` installs into `%LOCALAPPDATA%\Programs\Waku` with
`PrivilegesRequired=lowest`, so installing or upgrading never raises a UAC
prompt. **Never change `AppId` in that file** — it is how Windows recognizes an
existing install, and a new one turns every upgrade into a second copy in
Add/Remove Programs.

## What this fork changed vs upstream

Upstream ships signed in-app updates through Sparkle and a Cloudflare R2
bucket at `releases.waku.sh`. This fork points that machinery at its own
bucket and key instead, because leaving the upstream feed URL would replace an
install with an upstream binary:

- `FEED_URL` is set on **Windows only** (per-arch `r2.dev` URLs). Linux stays
  `None`; macOS is not built by this fork, and `SUFeedURL` in `Info.plist`
  points at this fork's bucket for consistency.
- `SUPublicEDKey` is this fork's own key; only `SPARKLE_PRIVATE_KEY`'s mate
  can ship updates these builds accept.
- The `draft-release` job signs the Windows appcasts and uploads installers +
  feeds to R2 inline.
- [`.github/workflows/sync-release.yml`](.github/workflows/sync-release.yml) is
  kept for reference but is **disabled** — it only runs on manual dispatch.

`scripts/release.ts` is macOS-only (`process.platform !== "darwin"` exits) and
does not run in CI; the Windows halves (`bundle-windows.ts`,
`appcast-windows.ts`) are what CI uses.

## Secrets

| Secret | Purpose |
| --- | --- |
| `SPARKLE_PRIVATE_KEY` | **required for updates**; base64 EdDSA private key mating `SUPublicEDKey` |
| `R2_ACCOUNT_ID` | Cloudflare account ID for the R2 upload |
| `R2_ACCESS_KEY_ID` | R2 API token access key (Object Read & Write, this bucket) |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET` | R2 bucket name (public `r2.dev` access enabled) |
| `WINDOWS_CERTIFICATE` | optional; base64-encoded Authenticode `.pfx` |
| `WINDOWS_CERTIFICATE_PASSWORD` | optional; password for that `.pfx` |

`WAKU_*` environment variables are upstream's names and are kept as-is so the
fork stays close to its upstream.
