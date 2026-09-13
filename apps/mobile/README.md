# Waku Mobile

Expo client for connecting to one or more remote Kerenzikov daemons from iOS,
Android.

## Run

From the repository root:

```sh
bun install
bun --filter @waku/mobile ios
bun --filter @waku/mobile android
```

## Connect

In Kerenzikov Desktop, enable the remote daemon and copy its WebSocket address and
token. Add those values in the mobile app. Use `wss://` outside a trusted LAN
or private tailnet; the token grants full control of the daemon host.

Both devices must stay on the same network, and the desktop must stay awake
with exposure on: turning exposure off (or a Windows firewall without an
inbound rule for `waku-daemon.exe`) makes a saved phone profile fail with
"can't reach", in which case re-copy the current address from the desktop.

Saved profile metadata stays in app storage. On iOS and Android, daemon tokens
are stored separately in the device keychain through Expo SecureStore.

Waku is licensed under the repository's GNU GPL v3.0-only license.
