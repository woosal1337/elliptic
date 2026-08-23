#!/usr/bin/env python3
"""Shrink the captured PNGs to the size the README actually shows.

A capture is taken at two device pixels per CSS pixel, so a web shot arrives
about 3000 px wide. GitHub renders a README image at 880 px at the most, and
half that inside a two-column table. This resamples each file down to a width
that still looks sharp on a high-density screen, then re-encodes it.

    apps/api/.venv/bin/python scripts/screenshots/optimize.py

It is safe to run more than one time. A file already at or below its target
width stays as it is.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ASSETS = Path(__file__).resolve().parents[2] / ".github" / "assets"

# Target width in pixels, by how large the README draws the image.
WIDTHS = {
    "web-board": 2000,  # the full-width hero
    "web": 1500,  # the gallery, two per row
    "mobile": 560,  # a phone, four per row
}


def target_width(name: str) -> int:
    if name.startswith("web-board"):
        return WIDTHS["web-board"]
    if name.startswith("mobile-"):
        return WIDTHS["mobile"]
    if name.startswith("web-"):
        return WIDTHS["web"]
    return 0


def main() -> int:
    if not ASSETS.is_dir():
        print(f"no such directory: {ASSETS}")
        return 1

    before = 0
    after = 0
    for path in sorted(ASSETS.glob("*.png")):
        width = target_width(path.stem)
        if width == 0:
            continue

        size = path.stat().st_size
        before += size
        with Image.open(path) as image:
            if image.width <= width:
                after += size
                continue
            height = round(image.height * width / image.width)
            resized = image.convert("RGB").resize((width, height), Image.LANCZOS)
            resized.save(path, format="PNG", optimize=True)

        new_size = path.stat().st_size
        after += new_size
        print(f"  {path.name:32} {size // 1024:5} KB -> {new_size // 1024:5} KB")

    print(f"\n{before // 1024} KB -> {after // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
