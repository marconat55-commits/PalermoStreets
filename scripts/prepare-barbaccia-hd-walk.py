#!/usr/bin/env python3
"""Prepare the HD Barbaccia walk review frames without changing source art."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art_source/stage1_zen/barbaccia_hd_master"
OUTPUT = SOURCE / "walk_frames_v1"
CANVAS = (640, 420)
VISIBLE_HEIGHT = 316
FEET_Y = 400
LANES = ((0, 558), (558, 1117), (1117, 1640), (1640, 2172))


def prepare(source: Image.Image, filename: str) -> dict[str, object]:
    image = source.convert("RGBA")
    alpha = image.getchannel("A").point(lambda value: value if value >= 16 else 0)
    image.putalpha(alpha)
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError(f"Empty Barbaccia pose: {filename}")
    cropped = image.crop(bounds)
    width = round(cropped.width * VISIBLE_HEIGHT / cropped.height)
    if width > CANVAS[0]:
        raise ValueError(f"Barbaccia pose too wide: {filename}")
    resized = cropped.resize((width, VISIBLE_HEIGHT), Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", CANVAS)
    frame.alpha_composite(resized, ((CANVAS[0] - width) // 2, FEET_Y - VISIBLE_HEIGHT))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    frame.save(OUTPUT / filename, optimize=True)
    visible = frame.getchannel("A")
    return {
        "file": f"walk_frames_v1/{filename}",
        "bounds": list(visible.getbbox() or ()),
        "opaque_pixels": sum(visible.histogram()[128:]),
    }


def main() -> None:
    master = Image.open(SOURCE / "BARBACCIA_HD_USER_MASTER.png")
    sheet = Image.open(SOURCE / "BARBACCIA_HD_WALK_CONTACT_SHEET_SOURCE.png")
    opposite = Image.open(SOURCE / "BARBACCIA_HD_OPPOSITE_CONTACT_SOURCE.png")
    if sheet.size != (2172, 724):
        raise ValueError(f"Unexpected walk sheet size: {sheet.size}")

    frames = [
        prepare(master, "01_contact_right.png"),
        prepare(sheet.crop((LANES[1][0], 0, LANES[1][1], sheet.height)), "02_pass_left.png"),
        prepare(opposite, "03_contact_left.png"),
        prepare(sheet.crop((LANES[3][0], 0, LANES[3][1], sheet.height)), "04_pass_right.png"),
    ]
    merco = Image.open(ROOT / "public/assets/characters/merco_anim/idle/01.png").convert("RGBA")
    merco_area = sum(merco.getchannel("A").histogram()[128:])
    ratios = [round(int(frame["opaque_pixels"]) / merco_area, 2) for frame in frames]
    if any(not 1.7 <= ratio <= 2.5 for ratio in ratios):
        raise ValueError(f"Barbaccia mass drift vs Merco: {ratios}")
    manifest = {
        "schema": 1,
        "status": "art_review_only",
        "identity_master": "BARBACCIA_HD_USER_MASTER.png",
        "canvas": list(CANVAS),
        "feet_y": FEET_Y,
        "durations_ms": [165, 125, 165, 125],
        "visible_area_vs_merco": ratios,
        "frames": frames,
    }
    (SOURCE / "walk_manifest_v1.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Barbaccia HD walk: {len(frames)} poses; visible area vs Merco: {ratios}")


if __name__ == "__main__":
    main()
