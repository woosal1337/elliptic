#!/usr/bin/env python3
"""Render the Elliptic mark to every icon raster the apps need.

Stdlib only. There is no SVG rasteriser on a stock macOS box, and the mark is
four analytic shapes — a plate, a tilted ellipse ring, and a dot with a gap
punched around it — so it is cheaper to evaluate them directly than to take on
librsvg or a Node image pipeline for eleven PNGs.

Shapes are drawn from signed distance fields and antialiased by the coverage of
one pixel against the boundary, which is what gives clean edges at 48px as well
as 1024px.

    python3 scripts/render-brand.py          # write every target
    python3 scripts/render-brand.py --check  # verify on-disk files are current

Geometry lives here rather than being parsed out of the SVG: the SVG is the
design record, this is the build. Keep the two in step by hand — there are six
numbers.
"""

from __future__ import annotations

import argparse
import hashlib
import math
import pathlib
import struct
import sys
import zlib

# ---- Geometry, in SVG user units on a 1024 canvas ---------------------------

CANVAS = 1024.0
CX = CY = 512.0
RX, RY = 336.0, 186.0  # ellipse semi-axes
TILT = math.radians(-28.0)  # ellipse rotation about the centre
STROKE = 26.0  # ring weight
THETA = math.radians(18.0)  # where the dot sits on the ring
DOT_R = 46.0
GAP_R = 59.0  # erased ring of paper separating dot from stroke
PLATE_R = 227.9  # iOS-ish corner radius, for the plate variants

PAPER = (0x10, 0x10, 0x10)
INK = (0xF5, 0xF5, 0xF5)

# The dot is derived from THETA rather than pinned, so moving the parameter
# moves the dot and it stays on the ring instead of drifting off it.
_x0, _y0 = RX * math.cos(THETA), RY * math.sin(THETA)
_c, _s = math.cos(TILT), math.sin(TILT)
DOT_X = CX + _x0 * _c - _y0 * _s
DOT_Y = CY + _x0 * _s + _y0 * _c

# Android masks the adaptive foreground to a circle of 66/108 of the canvas and
# animates within it, so the mark has to sit inside that or the launcher clips
# the dot off. This is the scale that makes the furthest drawn pixel land on the
# safe circle.
_REACH = math.hypot(DOT_X - CX, DOT_Y - CY) + GAP_R
ADAPTIVE_SCALE = (0.66 / 2 * CANVAS) / _REACH

# Optical sizes — see the note on TARGETS. Both are bounded so the mark cannot
# grow past the frame it is drawn in.
TAB_SCALE = 1.24  # browser tabs, which sit on a plate
UI_SCALE = 1.30  # bare mark in app chrome, which has no plate to overrun
assert _REACH * TAB_SCALE < CANVAS / 2, "tab mark would overrun the plate"
assert _REACH * UI_SCALE < CANVAS / 2, "ui mark would overrun the canvas"


# ---- Signed distance fields -------------------------------------------------


def _sd_circle(px: float, py: float, cx: float, cy: float, r: float) -> float:
    return math.hypot(px - cx, py - cy) - r


def _sd_ring(px: float, py: float) -> float:
    """Distance to the tilted ellipse's stroke.

    There is no closed form for the distance to an ellipse. The implicit
    function over the magnitude of its gradient is a first-order approximation
    that is exact on the boundary and accurate within a pixel or two of it,
    which is the only region where coverage is not already 0 or 1.
    """
    dx, dy = px - CX, py - CY
    # into the ellipse's own frame
    x = dx * _c + dy * _s
    y = -dx * _s + dy * _c
    f = (x / RX) ** 2 + (y / RY) ** 2 - 1.0
    gx, gy = 2.0 * x / (RX * RX), 2.0 * y / (RY * RY)
    g = math.hypot(gx, gy)
    if g == 0.0:
        return -RY  # dead centre; well inside
    return abs(f / g) - STROKE / 2.0


def _sd_roundrect(px: float, py: float, radius: float) -> float:
    half = CANVAS / 2.0
    qx = abs(px - CX) - (half - radius)
    qy = abs(py - CY) - (half - radius)
    outside = math.hypot(max(qx, 0.0), max(qy, 0.0))
    return outside + min(max(qx, qy), 0.0) - radius


# ---- Rasteriser -------------------------------------------------------------

RENDER = 1024  # master resolution; targets are area-resampled down from here


def _coverage(d_px: float) -> float:
    """Pixel coverage from a distance in pixels."""
    if d_px <= -0.5:
        return 1.0
    if d_px >= 0.5:
        return 0.0
    return 0.5 - d_px


def _render_master(plate: bool, radius: float, scale: float) -> list[list[float]]:
    """Render at RENDER**2 as rows of straight-alpha RGBA floats."""
    unit = CANVAS / RENDER  # canvas units per pixel
    rows: list[list[float]] = []
    for j in range(RENDER):
        py = (j + 0.5) * unit
        row: list[float] = []
        for i in range(RENDER):
            px = (i + 0.5) * unit

            if scale == 0.0:
                a = 0.0  # bare plate: the adaptive background carries no mark
            else:
                # Evaluate the mark in unscaled space; distances scale with it
                # so the antialiasing band stays one pixel wide however small
                # the mark gets.
                qx = CX + (px - CX) / scale
                qy = CY + (py - CY) / scale
                k = scale / unit

                a = _coverage(_sd_ring(qx, qy) * k)
                if a > 0.0:  # gap erases the stroke (destination-out)
                    a *= 1.0 - _coverage(_sd_circle(qx, qy, DOT_X, DOT_Y, GAP_R) * k)
                dot = _coverage(_sd_circle(qx, qy, DOT_X, DOT_Y, DOT_R) * k)
                if dot > 0.0:  # dot over what survives (source-over)
                    a = a + dot * (1.0 - a)

            if plate:
                p = _coverage(_sd_roundrect(px, py, radius) / unit)
                out_a = a + p * (1.0 - a)
                if out_a <= 0.0:
                    row.extend((0.0, 0.0, 0.0, 0.0))
                    continue
                w_ink, w_paper = a, p * (1.0 - a)
                row.extend(
                    (
                        (INK[0] * w_ink + PAPER[0] * w_paper) / out_a,
                        (INK[1] * w_ink + PAPER[1] * w_paper) / out_a,
                        (INK[2] * w_ink + PAPER[2] * w_paper) / out_a,
                        out_a,
                    )
                )
            else:
                row.extend((float(INK[0]), float(INK[1]), float(INK[2]), a))
        rows.append(row)
    return rows


def _resample(rows: list[list[float]], n: int) -> list[list[float]]:
    """Area-average down to n**2. Premultiplied, so transparent pixels do not
    drag their colour into the average and fringe the edges."""
    if n == RENDER:
        return rows
    step = RENDER / n
    out: list[list[float]] = []
    for j in range(n):
        y0, y1 = j * step, (j + 1) * step
        js = range(int(y0), min(int(math.ceil(y1)), RENDER))
        row: list[float] = []
        for i in range(n):
            x0, x1 = i * step, (i + 1) * step
            acc_r = acc_g = acc_b = acc_a = acc_w = 0.0
            for jj in js:
                wy = min(y1, jj + 1) - max(y0, jj)
                if wy <= 0:
                    continue
                src = rows[jj]
                for ii in range(int(x0), min(int(math.ceil(x1)), RENDER)):
                    wx = min(x1, ii + 1) - max(x0, ii)
                    if wx <= 0:
                        continue
                    w = wx * wy
                    o = ii * 4
                    a = src[o + 3]
                    acc_r += src[o] * a * w
                    acc_g += src[o + 1] * a * w
                    acc_b += src[o + 2] * a * w
                    acc_a += a * w
                    acc_w += w
            if acc_a <= 0.0:
                row.extend((0.0, 0.0, 0.0, 0.0))
            else:
                row.extend((acc_r / acc_a, acc_g / acc_a, acc_b / acc_a, acc_a / acc_w))
        out.append(row)
    return out


def _png(rows: list[list[float]], n: int, opaque: bool) -> bytes:
    """Encode as PNG. Opaque targets drop the alpha channel outright: the App
    Store rejects an alpha channel on an icon, and a fully-opaque one still
    counts."""
    depth = 3 if opaque else 4
    raw = bytearray()
    for j in range(n):
        raw.append(0)  # filter type 0
        src = rows[j]
        for i in range(n):
            o = i * 4
            a = src[o + 3]
            if opaque:
                # composite onto paper so the corners outside a rounded plate
                # do not come out black
                for ch in range(3):
                    raw.append(int(round(src[o + ch] * a + PAPER[ch] * (1.0 - a))))
            else:
                for ch in range(3):
                    raw.append(int(round(src[o + ch])))
                raw.append(int(round(a * 255.0)))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", n, n, 8, 2 if opaque else 6, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )


# ---- Targets ----------------------------------------------------------------

MOBILE = "apps/mobile/assets/images"
WEB = "apps/web/apps/web"

# (path, size, plate, radius, scale, opaque)
#
# Anything the OS masks itself is a full square: iOS and Android both round the
# icon, and a pre-rounded source shows up as dark wedges outside their mask.
# Anything shown as-authored keeps the plate.
TARGETS: list[tuple[str, int, bool, float, float, bool]] = [
    # Masked by the OS — square, opaque, no alpha.
    (f"{MOBILE}/app-icon.png", 1024, True, 0.0, 1.0, True),
    (f"{MOBILE}/app-icon-ios.png", 1024, True, 0.0, 1.0, True),
    (f"{MOBILE}/app-icon-all.png", 1024, True, 0.0, 1.0, True),
    (f"{MOBILE}/app-icon-android-legacy.png", 1024, True, 0.0, 1.0, True),
    # Adaptive pair: transparent foreground inside the safe circle, flat back.
    (
        f"{MOBILE}/app-icon-android-adaptive-foreground.png",
        1024,
        False,
        0.0,
        ADAPTIVE_SCALE,
        False,
    ),
    (f"{MOBILE}/app-icon-android-adaptive-background.png", 1024, True, 0.0, 0.0, True),
    # Shown as-authored.
    #
    # The two browser-tab icons are drawn larger. A stroke of 26/1024 is 2.5% of
    # the width, which at a 16px tab is a third of a pixel — it resolves as grey
    # smudge that never reaches full white, while the same mark at TAB_SCALE
    # reads as an orbit. Everything else stays at 1.0; this is optical sizing
    # for one viewing size, not a change to the mark.
    (f"{MOBILE}/app-icon-web-favicon.png", 256, True, PLATE_R, TAB_SCALE, False),
    (f"{MOBILE}/splash-icon.png", 1024, False, 0.0, 1.0, False),
    (f"{WEB}/src/app/icon.png", 512, True, PLATE_R, TAB_SCALE, False),
    (f"{WEB}/src/app/apple-icon.png", 180, True, 0.0, 1.0, True),
    # LogoMark renders this at 24px in the app chrome, so it gets the same
    # optical treatment as the tab icons — at 1.0 the stroke never reaches full
    # white and the mark reads as grey smudge beside a crisp wordmark.
    (f"{WEB}/public/logo.png", 512, False, 0.0, UI_SCALE, False),
    # The README renders on whichever theme the reader has, so this one keeps
    # its plate: a bare white mark disappears against GitHub's light background.
    (".github/assets/logo.png", 512, True, PLATE_R, 1.0, False),
]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="verify, write nothing")
    args = ap.parse_args()

    root = pathlib.Path(__file__).resolve().parent.parent

    # One master per distinct (plate, radius, scale); sizes resample from it.
    masters: dict[tuple[bool, float, float], list[list[float]]] = {}
    stale = []
    for rel, n, plate, radius, scale, opaque in TARGETS:
        key = (plate, radius, scale)
        if key not in masters:
            masters[key] = _render_master(plate, radius, scale)
        data = _png(_resample(masters[key], n), n, opaque)

        path = root / rel
        if args.check:
            cur = path.read_bytes() if path.exists() else b""
            mark = "ok "
            if hashlib.sha256(cur).digest() != hashlib.sha256(data).digest():
                mark = "STALE"
                stale.append(rel)
            print(f"  {mark}  {rel}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            print(f"  {n:>4}px  {len(data):>7,}B  {rel}")

    if args.check and stale:
        print(f"\n{len(stale)} file(s) differ from the renderer — run without --check")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
