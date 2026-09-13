# Releasing Kerenzikov

This fork releases **Windows and Android** only, from GitHub Actions, as assets
on a GitHub release. There is **no auto-updater and no update feed**: nothing is
signed for one, no appcast is generated, and no artifacts are uploaded to any
bucket. Users install a newer release by downloading it.

The release path is [`.github/workflows/release.yml`](.github/workflows/release.yml):

| Job | Runner | Produces |
| --- | --- | --- |
| `version` | ubuntu-latest | reads `version` from `Cargo.toml`, refuses a mismatched `v*` tag |
| `windows-x86_64` | windows-latest | `Kerenzikov-<version>-x86_64-Setup.exe`, `kerenzikov-<version>-x86_64-pc-windows-msvc.zip` |
| `windows-arm64` | windows-11-arm | `Kerenzikov-<version>-aarch64-Setup.exe`, `kerenzikov-<version>-aarch64-pc-windows-msvc.zip` |
| `android-apk` | ubuntu-22.04 | `Kerenzikov-<version>-universal.apk` |
| `draft-release` | ubuntu-latest | a **draft** GitHub release with all of the above, plus `latest-windows.txt` |

Trigger it either way:

- **Push a `v*` tag** — the tag must match `version` in `Cargo.toml`, or the run
  fails before anything builds.
- **Actions → Release → Run workflow** — no tag needed. The run releases
  whatever `Cargo.toml` says and drafts it as `v<version>`.

The draft is never published automatically; publish it from the GitHub UI when
the artifacts look right.

## Cutting a release

1. **Bump `version` in `Cargo.toml`** — the single source of truth for both the
   workflow and the artifact names.
2. **Write the release notes** — add a `## [<version>]` section at the top of
   [`CHANGELOG.md`](CHANGELOG.md). The `draft-release` job extracts that section
   as the release body, falling back to commits since the previous `v*` tag when
   there is no matching section.
3. **Push the tag** (`git tag v<version> && git push origin v<version>`) or run
   the workflow manually, then publish the draft.

### Signing

Both Windows executables and the installer are Authenticode-signed when
`WINDOWS_CERTIFICATE` (base64 `.pfx`) and `WINDOWS_CERTIFICATE_PASSWORD` are
set as repository secrets. Without them the script still packages and says so,
at the cost of a SmartScreen warning on first launch.

The APK is signed with the debug keystore
(`apps/mobile/android/app/build.gradle`), which is what the release build
configures. It is not a Play Store signing key.

### The installers are per-user on purpose

`resources/windows/waku.iss` installs into `%LOCALAPPDATA%\Programs\Waku` with
`PrivilegesRequired=lowest`, so installing or upgrading never raises a UAC
prompt. **Never change `AppId` in that file** — it is how Windows recognizes an
existing install, and a new one turns every upgrade into a second copy in
Add/Remove Programs.

## What this fork removed

The upstream project ships signed in-app updates through Sparkle and a
Cloudflare R2 bucket at `releases.waku.sh`. This fork removed all of it, because
pointing at upstream's feed could replace an install with an upstream binary:

- `FEED_URL` is `None` on every platform, so `Updater::init` returns `None` and
  the app shows no update UI at all.
- The `draft-release` job does not sign an appcast or upload to R2.
- [`.github/workflows/sync-release.yml`](.github/workflows/sync-release.yml) is
  kept for reference but is **disabled** — it only runs on manual dispatch and
  needs `R2_*` secrets that do not exist here.

`src/updater.rs` still carries the macOS Sparkle driver and the native
Windows/Linux flows behind that seam, and `scripts/release.ts`,
`scripts/appcast.ts`, `scripts/appcast-windows.ts`, and
`scripts/appcast-linux.ts` are still in the tree. None of them run in CI, and
`scripts/release.ts` is macOS-only (`process.platform !== "darwin"` exits). They
are kept so a future fork can restore a feed by supplying a URL and a key;
restoring one means re-enabling the signing and upload steps as well.

## Secrets

| Secret | Purpose |
| --- | --- |
| `WAKU_ANALYTICS_ENDPOINT` | embedded in every desktop CI build |
| `WAKU_ANALYTICS_WEBSITE_ID` | embedded in every desktop CI build |
| `WINDOWS_CERTIFICATE` | optional; base64-encoded Authenticode `.pfx` |
| `WINDOWS_CERTIFICATE_PASSWORD` | optional; password for that `.pfx` |

`WAKU_*` environment variables are upstream's names and are kept as-is so the
fork stays close to its upstream.
