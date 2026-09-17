# Kerenzikov on Windows

## Install

Download `Kerenzikov-<version>-x86_64-Setup.exe` (or the `aarch64` installer on
an Arm device) from the
[latest release](https://github.com/yaffalhakim1/Kerenzikov-app/releases/latest) and run
it. It installs per-user into `%LOCALAPPDATA%\Programs\Waku`, so it never asks
for administrator rights — and upgrading later never does either.

### Portable

`kerenzikov-<version>-<target>.zip` is the same build without an installer. Unpack it
anywhere and run `waku.exe`.

**Keep the two executables together.** Kerenzikov launches `waku-daemon.exe` from its
own directory, so moving `waku.exe` out on its own leaves it unable to start
the daemon. A shortcut is fine.

To move to a newer build, unpack the new zip over this one. Nothing in the
install directory is user data, so replacing it wholesale is safe.

Kerenzikov expects:

- **Windows 10 version 1809 or newer**, or Windows 11.
- **A Direct3D 11 driver at feature level 11_0 or newer.** GPUI renders
  through DirectX and falls back to the Microsoft Basic Render Driver, so it
  can run in a VM — see Troubleshooting if the window comes up black.
- **x86_64 or aarch64.**

Nothing else: Kerenzikov links the C runtime statically, so there is no Visual C++
redistributable to install first. That matters most on Arm devices, which
rarely have the arm64 redistributable already.

SmartScreen may warn about an unrecognized publisher on first launch when the
release was not code-signed. Choose **More info → Run anyway**.

## Updating

Kerenzikov updates itself. On launch it polls this fork's own signed update feed
(a Sparkle-format appcast on Cloudflare R2), compares the newest version there
against the one it is running, and offers anything newer in place. **Check for
Updates…** in the app menu asks on demand, and **Settings → General → Automatic
updates** controls the launch check.

The installer it downloads is verified against this fork's Ed25519 public key
before it runs, so a build from any other source, including upstream Waku, is
rejected. The feed ships no entry for anything but this fork's own signed
builds. See [RELEASING.md](../RELEASING.md) for how the feed is produced.

Running a newer installer over an existing install replaces it in place: tasks,
transcripts, and settings are untouched.

## Where Kerenzikov keeps its data

| What | Path |
| --- | --- |
| Tasks, sessions, transcripts | `%LOCALAPPDATA%\Waku\app.db` |
| Attachments and blobs | `%LOCALAPPDATA%\Waku\blobs` |
| Settings | `%USERPROFILE%\.waku\app.json` |
| Project memory facts | `%USERPROFILE%\.waku\memory\` (plus `MEMORY.md` in each project) |

Unpacking a new release over the old directory leaves all of it untouched.

## Closing to the tray

Closing the window hides Kerenzikov to the notification tray instead of quitting,
so background turns keep streaming. Left-click the tray icon or choose **Show**
to bring it back; **Quit** (tray menu or the app menu) exits fully. If the
tray icon cannot be created, closing quits as before — the app never strands
itself windowless.

## Agent CLIs

Kerenzikov detects the provider CLIs on `PATH` and, because a fresh `PATH` may
predate an install, also looks in the usual per-user prefixes:
`%APPDATA%\npm`, `%USERPROFILE%\.bun\bin`, `%USERPROFILE%\.cargo\bin`,
`%USERPROFILE%\scoop\shims`, and `%LOCALAPPDATA%\Microsoft\WindowsApps`.

Bare names resolve through `PATHEXT`, so the `claude.cmd` shim npm installs is
found the same way `claude` would be in a shell. Nothing is spawned with a
console window attached.

If a CLI is installed but not detected, set its path explicitly in
**Settings → Providers**.

## Terminal

The built-in terminal opens PowerShell 7 (`pwsh.exe`) when it is installed,
then Windows PowerShell, then whatever `COMSPEC` names. Ctrl+Shift+C and
Ctrl+Shift+V copy and paste so Ctrl+C stays available to the shell.

## Browser

The right panel's Browser tab runs on WebView2, which is in-box on Windows 11
and evergreen-installed on Windows 10. Navigation, devtools, downloads, and
pop-up handling behave as they do on macOS.

Kerenzikov hosts it in *visual* mode rather than as a child window: the page renders
into a DirectComposition visual that GPUI hands out between its own content
and its overlay plane, so menus, tooltips and dialogs composite above a live
page instead of hiding it. That is also why the browser needs a working
composition path — see the black-window note under Troubleshooting.

Differences worth knowing:

- **No load progress in the toolbar.** WebView2 reports no equivalent of
  WebKit's `estimatedProgress`, so the bar stays empty while a page loads.
- **Devtools open but do not toggle.** WebView2 offers no way to ask whether
  its devtools window is open, or to close it, so the shortcut only opens and
  refocuses it.
- **Pen, touch and dragging files into the page are not wired up.** Visual
  hosting delivers no input of its own; Kerenzikov forwards mouse, wheel, cursor and
  focus, and leaves `SendPointerInput` and the external drop target for later.
  Keyboard and IME are unaffected — those still reach the page directly once
  it holds focus.

## What is not available yet

- **Computer use.** The runtime and its UI stay disabled off macOS.
- **Terminals over the daemon's browser client.** The desktop terminal works;
  a remote browser client connected to a Windows daemon cannot open one.

## Troubleshooting

**The window opens black, or the app exits at startup.** Kerenzikov needs a working
Direct3D 11 device. Update the GPU driver; in a VM, enable 3D acceleration.

**A provider is listed as not installed.** Open a new PowerShell window and run
the CLI by name. If the shell cannot find it either, the install did not put a
shim on `PATH`. If the shell finds it but Kerenzikov does not, set the binary path in
**Settings → Providers** and file an issue with the install method.

**Git-backed features do nothing.** Kerenzikov shells out to `git`. Install Git for
Windows and make sure `git --version` works in a new terminal.

**A phone on the LAN can't reach the daemon.** Three checks, in order:
desktop and phone on the same Wi-Fi (or tailnet); **Settings → Daemon →
Expose managed daemon** on, with the address shown there matching what the
phone saved (toggling exposure off rebinds to loopback and silently bricks
saved phones); and an inbound firewall rule for `waku-daemon.exe`, which
Windows blocks by default. In an elevated PowerShell (adjust the port if you
customized it in Daemon settings):

```powershell
New-NetFirewallRule -DisplayName "Kerenzikov daemon" -Direction Inbound `
  -Program "$env:LOCALAPPDATA\Programs\Waku\waku-daemon.exe" `
  -Protocol TCP -LocalPort 34123 -Action Allow
```
