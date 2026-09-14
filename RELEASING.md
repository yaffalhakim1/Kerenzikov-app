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

## Cutting a release

1. **Bump `version` in `Cargo.toml`** — the single source of truth for both the
   workflow and the artifact names.
2. **Write the release notes** — add a `## [<version>]` section at the top of
   [`CHANGELOG.md`](CHANGELOG.md). The `draft-release` job extracts that section
   as the release body, falling back to commits since the previous `v*` tag when
   there is no matching section.
3. **Push the tag** (`git tag v<version> && git push origin v<version>`) or run
   the workflow manually, then verify before publishing the draft:
   - `artifacts/` contains `appcast-windows-x86_64.xml` (and `-aarch64` when
     that leg built).
   - The bucket contains the new `.exe` plus the feeds (`rclone lsf`).
   - The XML's `<enclosure url="...">` points at this fork's `r2.dev` URL.
4. **Publish the draft** in the GitHub UI. The first published feed seeds the
   bucket; every later install compares against it.

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
| `WAKU_ANALYTICS_ENDPOINT` | embedded in every desktop CI build |
| `WAKU_ANALYTICS_WEBSITE_ID` | embedded in every desktop CI build |
| `SPARKLE_PRIVATE_KEY` | **required for updates**; base64 EdDSA private key mating `SUPublicEDKey` |
| `R2_ACCOUNT_ID` | Cloudflare account ID for the R2 upload |
| `R2_ACCESS_KEY_ID` | R2 API token access key (Object Read & Write, this bucket) |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET` | R2 bucket name (public `r2.dev` access enabled) |
| `WINDOWS_CERTIFICATE` | optional; base64-encoded Authenticode `.pfx` |
| `WINDOWS_CERTIFICATE_PASSWORD` | optional; password for that `.pfx` |

`WAKU_*` environment variables are upstream's names and are kept as-is so the
fork stays close to its upstream.
