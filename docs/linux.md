# Kerenzikov on Linux

Linux is **build from source only** in this fork. There is no published Linux
release and no install script: the release workflow builds Windows and Android,
and the upstream project's `install.sh` and `releases.waku.sh` feed are not
part of this fork. Everything below assumes you produced the archive yourself
with [`scripts/bundle-linux.sh`](../scripts/bundle-linux.sh).

## Building

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the compiler and GPUI runtime
prerequisites, then produce the archive:

```sh
./scripts/bundle-linux.sh
```

It writes `target/release/kerenzikov-<version>-<target>.tar.gz` with an
install-prefix layout (`bin/`, `share/`) beneath one versioned directory.

Kerenzikov expects:

- **glibc 2.35 or newer** — Ubuntu 22.04, Debian 12, Fedora 36, and anything
  more recent.
- **A working Vulkan or OpenGL driver.** Kerenzikov renders through wgpu, which tries
  Vulkan first and falls back to GL. Software rasterizers (lavapipe, llvmpipe)
  are accepted, so it can run in a VM, but see the note below.
- **x86_64 or aarch64.** Other architectures build from source.
- `xdg-desktop-portal` for native file dialogs.

## Installing

Unpack the archive wherever you like:

```sh
mkdir -p ~/.local/waku.app
tar -xzf kerenzikov-<version>-<target>.tar.gz --strip-components=1 -C ~/.local/waku.app
ln -sf ~/.local/waku.app/bin/waku ~/.local/bin/waku   # optional
```

The archive uses an install-prefix layout (`bin/`, `share/`) beneath one
versioned directory, so `--strip-components=1` into a prefix such as
`/usr/local` works too.

**Keep `bin/` intact.** Kerenzikov launches `waku-daemon` from its own
directory, so copying `bin/waku` somewhere on its own leaves it unable to start
the daemon. A symlink is fine — Kerenzikov resolves it back to the real path.

Installing the desktop entry is the part that matters — it is how the app is
launched normally, and it is what associates the running window with its icon
and name (Kerenzikov reports the Wayland `app_id` / X11 `WM_CLASS` `sh.waku`, which
matches the entry's filename). Install the packaged file and point it at the
install (the packaged copy uses bare `Exec=waku` and `Icon=sh.waku` names so it
can be relocated):

```sh
install -D ~/.local/waku.app/share/applications/sh.waku.desktop \
  -t ~/.local/share/applications
sed -i "s|^Exec=waku$|Exec=$HOME/.local/waku.app/bin/waku|" \
  ~/.local/share/applications/sh.waku.desktop
sed -i "s|^Icon=sh.waku$|Icon=$HOME/.local/waku.app/share/icons/hicolor/256x256/apps/sh.waku.png|" \
  ~/.local/share/applications/sh.waku.desktop
```

## Updating

Updates are manual. This build ships no update feed, so the Linux updater does
not initialize: there is no **Check for Updates** item and no **Automatic
updates** setting. Build a newer archive and unpack it over the install when you
want one.

Projects and settings live in `~/.waku`, outside the install prefix, so
replacing the prefix leaves them untouched.

## Uninstalling

```sh
rm -rf ~/.local/waku.app ~/.local/bin/waku \
  ~/.local/share/applications/sh.waku.desktop
```

Projects and settings stay in `~/.waku`; delete that directory to remove them
too.

## Running in a virtual machine

VMs usually have no GPU passthrough, so Mesa falls back to a software
rasterizer. That works in principle — wgpu accepts a CPU adapter — but both
lavapipe (Vulkan) and llvmpipe (GL) JIT-compile shaders through LLVM, and that
path is fragile: on Fedora 44 aarch64 (mesa 26.0.3 + LLVM 22.1) it segfaults
inside `gallivm_jit_function` while compiling a fragment shader. The crash is
in the driver, not in Kerenzikov, and no application-side setting avoids it.

If the app dies on its first frame in a VM, check `coredumpctl info` for a
backtrace through `libvulkan_lvp.so` or `libgallium`. The reliable fix is to
give the guest a real GL driver — on UTM that means the QEMU backend with
virtio-gpu-gl (virgl) rather than Apple Virtualization, which offers Linux
guests no 3D at all. `VK_DRIVER_FILES=/nonexistent.json` hides the software
Vulkan driver so wgpu takes the GL path instead.


VMs usually have no GPU passthrough, so Mesa falls back to a software
rasterizer. That works in principle — wgpu accepts a CPU adapter — but both
lavapipe (Vulkan) and llvmpipe (GL) JIT-compile shaders through LLVM, and that
path is fragile: on Fedora 44 aarch64 (mesa 26.0.3 + LLVM 22.1) it segfaults
inside `gallivm_jit_function` while compiling a fragment shader. The crash is
in the driver, not in Kerenzikov, and no application-side setting avoids it.

If the app dies on its first frame in a VM, check `coredumpctl info` for a
backtrace through `libvulkan_lvp.so` or `libgallium`. The reliable fix is to
give the guest a real GL driver — on UTM that means the QEMU backend with
virtio-gpu-gl (virgl) rather than Apple Virtualization, which offers Linux
guests no 3D at all. `VK_DRIVER_FILES=/nonexistent.json` hides the software
Vulkan driver so wgpu takes the GL path instead.
