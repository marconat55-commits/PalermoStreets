#!/usr/bin/env python3
"""Normalize a reviewed 2x2 enemy proof sheet into inspectable frame candidates.

This is an art-source preparation step, not a runtime character import. The
source sheet is never modified; generated frames remain outside public/.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

CANVAS = (640, 420)
BASELINE_Y = 400
ALPHA_CUTOFF = 16
POSE_NAMES = ("guard_open", "guard_closed", "walk_contact", "walk_pass")


def prepare(sheet_path: Path, output_dir: Path, visual_height: int) -> None:
    sheet = Image.open(sheet_path).convert("RGBA")
    cell_w, cell_h = sheet.width // 2, sheet.height // 2
    cells = [
        sheet.crop((x * cell_w, y * cell_h,
                    sheet.width if x else cell_w,
                    sheet.height if y else cell_h))
        for y in range(2)
        for x in range(2)
    ]
    boxes = [
        cell.getchannel("A").point(lambda value: 255 if value >= ALPHA_CUTOFF else 0).getbbox()
        for cell in cells
    ]
    if any(box is None for box in boxes):
        raise ValueError("One or more pilot poses are empty")

    # One common scale preserves the relative mass and crouch height of every pose.
    reference_height = max(box[3] - box[1] for box in boxes if box is not None)
    scale = visual_height / reference_height
    output_dir.mkdir(parents=True, exist_ok=True)

    for name, cell, box in zip(POSE_NAMES, cells, boxes, strict=True):
        assert box is not None
        crop = cell.crop(box)
        alpha = crop.getchannel("A").point(
            lambda value: 0 if value < ALPHA_CUTOFF else value
        )
        crop.putalpha(alpha)
        size = (round(crop.width * scale), round(crop.height * scale))
        sprite = crop.resize(size, Image.Resampling.LANCZOS)
        frame = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        left = (CANVAS[0] - sprite.width) // 2
        top = BASELINE_Y - sprite.height
        if left < 12 or top < 8 or left + sprite.width > CANVAS[0] - 12:
            raise ValueError(f"{name}: sprite exceeds the safe canvas margins")
        frame.alpha_composite(sprite, (left, top))
        frame.save(output_dir / f"{name}.png")
        print(f"{name}: {size[0]}x{size[1]}, left={left}, bottom={top + size[1]}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sheet", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--visual-height", type=int, default=318)
    args = parser.parse_args()
    prepare(args.sheet, args.output_dir, args.visual_height)
