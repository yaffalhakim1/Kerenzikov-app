#!/usr/bin/env python3
"""Generate every desktop and Android icon from one master image.

Usage:
    python scripts/icons.py path/to/logo-1024.png

The master must be a square image, 1024x1024 or larger. A full-bleed square
with a solid background works; the script trims it to the macOS icon grid and
masks the corners itself.

macOS icons are not plain squares. Apple's grid puts the art on a squircle
occupying ~82% of the canvas with transparent corners, and an app that ships a
hard square looks out of place in the Dock. `--macos-mask squircle` (the
default) applies that treatment: the art is scaled to 82% and clipped to a
superellipse. Use `--macos-mask square` for a flat full-bleed icon, or `none`
to keep the master's own shape.

Windows and Android get the full-bleed square, because that is what each
platform expects: Windows draws its own shape and Android's launcher masks the
adaptive icon.

Writes, relative to the repository root:
    resources/AppIcon.icns           macOS release icon
    resources/AppIconDev.icns        macOS dev icon (same art)
    resources/windows/AppIcon.ico    Windows installer + exe
    apps/mobile/android/app/src/main/res/...   Android launcher + splash

With --web, also writes into the sibling kerenzikov site repo:
    public/favicon.png               32x32
    public/apple-touch-icon.png      180x180
    public/og-icon.png               512x512
    public/app-icon.png              256x256 (header slot, if you re-add one)

Requires Pillow (`pip install Pillow`).
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("Pillow is required: pip install Pillow")

REPO = Path(__file__).resolve().parent.parent
RES = REPO / "apps" / "mobile" / "android" / "app" / "src" / "main" / "res"

# Sibling checkout of the landing-page repo. Override with --web-dir.
WEB = REPO.parent / "kerenzikov" / "public"

# Windows: the seven sizes the existing .ico carries.
ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

# macOS icon grid: the squircle occupies this fraction of the canvas. Apple's
# templates use 824/1024, and the existing AppIcon.icns measures 82%.
MACOS_ART_SCALE = 0.82

# Superellipse exponent. macOS squircles are ~5; a plain rounded rectangle is 2.
SQUIRCLE_N = 5.0

# Android adaptive icons mask the outer ring, so the glyph is fitted to the
# centre 66% (the documented safe zone) of the foreground layer.
ADAPTIVE_SAFE_ZONE = 0.66

# Android density buckets: (bucket, launcher, foreground, splash).
# Launcher is the legacy square icon the manifest points at. Foreground is the
# adaptive-icon layer at 2.25x. Splash is the launch screen mark.
DENSITIES = [
    ("mdpi", 48, 108, 288),
    ("hdpi", 72, 162, 432),
    ("xhdpi", 96, 216, 576),
    ("xxhdpi", 144, 324, 864),
    ("xxxhdpi", 192, 432, 1152),
]


def load_master(path: Path) -> Image.Image:
    if not path.exists():
        sys.exit(f"no such file: {path}")

    image = Image.open(path).convert("RGBA")
    width, height = image.size

    if width != height:
        sys.exit(f"master must be square, got {width}x{height}")
    if width < 1024:
        sys.exit(f"master must be at least 1024x1024, got {width}x{height}")

    return image


def squircle_mask(size: int) -> Image.Image:
    """An anti-aliased superellipse mask, the shape macOS uses for app icons.

    Drawn at 4x and downsampled so the curved edge is smooth; a hard 1-bit
    mask produces visible stair-stepping once the OS scales the icon up.
    """
    supersample = 4
    big = size * supersample
    mask = Image.new("L", (big, big), 0)
    draw = ImageDraw.Draw(mask)

    # Sample the superellipse |x|^n + |y|^n = 1 across a grid and fill by
    # scanline. Cheaper and more predictable than approximating with arcs.
    half = big / 2.0
    for row in range(big):
        y = (row + 0.5 - half) / half
        if abs(y) >= 1.0:
            continue
        # Solve for |x| at this y.
        x_limit = (1.0 - abs(y) ** SQUIRCLE_N) ** (1.0 / SQUIRCLE_N)
        x0 = int(round(half - x_limit * half))
        x1 = int(round(half + x_limit * half))
        draw.line([(x0, row), (x1, row)], fill=255)

    return mask.resize((size, size), Image.LANCZOS)


def to_macos(image: Image.Image, mode: str) -> Image.Image:
    """Fit the master to the macOS icon grid.

    `squircle` scales the art to 82% and clips it to a superellipse, matching
    how every other Dock icon is built. `square` keeps a full-bleed square.
    `none` returns the master untouched.
    """
    if mode == "none":
        return image

    size = image.size[0]
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    if mode == "squircle":
        inner = int(round(size * MACOS_ART_SCALE))
        art = image.resize((inner, inner), Image.LANCZOS)
        offset = (size - inner) // 2

        # The mask must match the art area, not the whole canvas: masking at
        # full size leaves the scaled-down art entirely inside the shape and
        # clips nothing, which ships a square icon that merely looks padded.
        art.putalpha(squircle_mask(inner))
        canvas.paste(art, (offset, offset), art)
        return canvas

    if mode == "square":
        return image.convert("RGBA")

    sys.exit(f"unknown --macos-mask value: {mode}")


def write_icns(master: Image.Image, target: Path, macos_mode: str) -> None:
    """macOS .icns. Pillow emits the PNG-based chunk set (ic07-ic14), which
    covers 16pt through 512pt at 1x and 2x. That is what macOS 10.7+ reads;
    the legacy ARGB chunks a macOS-generated file also carries are dead weight
    on any supported version."""
    to_macos(master, macos_mode).save(target, format="ICNS")


def write_ico(master: Image.Image, target: Path) -> None:
    """Windows .ico with every size embedded, so Explorer and the installer
    each pick the resolution they need instead of downscaling one bitmap.

    Windows composites the icon onto the taskbar itself and expects a square,
    so the art stays full-bleed here rather than pre-rounded."""
    master.save(
        target,
        format="ICO",
        sizes=[(s, s) for s in ICO_SIZES],
    )


def adaptive_foreground(master: Image.Image, size: int) -> Image.Image:
    """Build the Android adaptive-icon foreground layer.

    An adaptive icon composites `<foreground>` over `<background>`, so the
    foreground must be the glyph on transparency. Handing it the full-bleed
    master instead paints a dark square on top of the background layer, which
    is what a naive resize produces.

    The master's own background colour is sampled from its corners and keyed
    out, then the glyph is placed inside the 66% safe zone. The launcher masks
    the outer ring, so anything near the edge would be cropped.
    """
    rgba = master.convert("RGBA")
    width = rgba.size[0]
    pixels = rgba.load()

    # Sample the four corners; the master is a mark on a flat ground.
    corners = [
        pixels[1, 1],
        pixels[width - 2, 1],
        pixels[1, width - 2],
        pixels[width - 2, width - 2],
    ]
    bg = tuple(sum(c[i] for c in corners) // len(corners) for i in range(3))

    keyed = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    out = keyed.load()
    for y in range(width):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            # Distance from the ground colour, with a little tolerance so JPEG
            # and antialiasing noise near the edges does not survive as speckle.
            distance = abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2])
            if a > 8 and distance > 40:
                out[x, y] = (r, g, b, a)

    # Fit the glyph into the safe zone rather than filling the canvas.
    bbox = keyed.getbbox()
    if bbox is None:
        return Image.new("RGBA", (size, size), (0, 0, 0, 0))

    glyph = keyed.crop(bbox)
    target = int(round(size * ADAPTIVE_SAFE_ZONE))
    scale = min(target / glyph.size[0], target / glyph.size[1])
    glyph = glyph.resize(
        (max(1, round(glyph.size[0] * scale)), max(1, round(glyph.size[1] * scale))),
        Image.LANCZOS,
    )

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(
        glyph,
        ((size - glyph.size[0]) // 2, (size - glyph.size[1]) // 2),
        glyph,
    )
    return canvas


def write_android(master: Image.Image) -> int:
    """Android launcher, adaptive foreground, and splash mark per density.

    WebP is lossless here: these are flat-shaded marks where lossy compression
    shows ringing along the edges, and the files are small either way.
    """
    written = 0
    for bucket, launcher, foreground, splash in DENSITIES:
        directory = RES / f"mipmap-{bucket}"
        directory.mkdir(parents=True, exist_ok=True)

        # Legacy launcher: a full-bleed square is what pre-26 devices expect.
        resized = master.resize((launcher, launcher), Image.LANCZOS)
        resized.save(directory / "ic_launcher.webp", format="WEBP", lossless=True)
        written += 1

        # Adaptive foreground: glyph only, on transparency.
        adaptive_foreground(master, foreground).save(
            directory / "ic_launcher_foreground.webp",
            format="WEBP",
            lossless=True,
        )
        written += 1

        directory = RES / f"drawable-{bucket}"
        directory.mkdir(parents=True, exist_ok=True)
        resized = master.resize((splash, splash), Image.LANCZOS)
        resized.save(
            directory / "splashscreen_logo.png", format="PNG", optimize=True
        )
        written += 1

    return written


def write_web(master: Image.Image, directory: Path) -> int:
    """Landing-page icons. Sizes match what `src/routes/__root.tsx` declares:
    32 for the tab, 180 for the iOS home screen, 512 for the social card."""
    if not directory.is_dir():
        print(f"  skipped web icons: no such directory {directory}")
        return 0

    written = 0
    for name, size in (
        ("favicon.png", 32),
        ("apple-touch-icon.png", 180),
        ("og-icon.png", 512),
        ("app-icon.png", 256),
    ):
        resized = master.resize((size, size), Image.LANCZOS)
        resized.save(directory / name, format="PNG", optimize=True)
        written += 1

    return written


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}

    if len(args) != 1:
        sys.exit(__doc__)

    web_dir = WEB
    macos_mode = "squircle"
    for flag in flags:
        if flag.startswith("--web-dir="):
            web_dir = Path(flag.split("=", 1)[1]).resolve()
        elif flag.startswith("--macos-mask="):
            macos_mode = flag.split("=", 1)[1]
        elif flag == "--macos-mask":
            sys.exit("--macos-mask needs a value: squircle, square, or none")

    master = load_master(Path(args[0]))
    print(f"master: {master.size[0]}x{master.size[1]}  (macOS mask: {macos_mode})")

    icns = REPO / "resources" / "AppIcon.icns"
    write_icns(master, icns, macos_mode)
    print(f"  wrote {icns.relative_to(REPO)}")

    dev_icns = REPO / "resources" / "AppIconDev.icns"
    write_icns(master, dev_icns, macos_mode)
    print(f"  wrote {dev_icns.relative_to(REPO)}")

    ico = REPO / "resources" / "windows" / "AppIcon.ico"
    write_ico(master, ico)
    print(f"  wrote {ico.relative_to(REPO)}  ({len(ICO_SIZES)} sizes)")

    count = write_android(master)
    print(f"  wrote {count} Android assets across {len(DENSITIES)} densities")

    if "--web" in flags:
        count = write_web(master, web_dir)
        if count:
            print(f"  wrote {count} web icons to {web_dir}")


if __name__ == "__main__":
    main()
