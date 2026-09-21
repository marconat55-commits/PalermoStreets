#!/usr/bin/env python3
"""Normalize a reviewed 2x2 enemy proof sheet into inspectable frame candidates.

This is an art-source preparation step, not a runtime character import. The
source sheet is never modified; generated frames remain outside public/.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw

CANVAS = (640, 420)
BASELINE_Y = 400
ALPHA_CUTOFF = 16
POSE_NAMES = ("guard_open", "guard_closed", "walk_contact", "walk_pass")


def opaque_area(image: Image.Image) -> int:
    return sum(1 for value in image.getchannel("A").get_flattened_data() if value >= 128)


def prepare(sheet_path: Path, output_dir: Path, visual_height: int,
            reference_path: Path | None = None, columns: int = 2, rows: int = 2,
            pose_names: tuple[str, ...] = POSE_NAMES, mass_min: float = 1.75,
            mass_max: float = 2.35) -> None:
    sheet = Image.open(sheet_path).convert("RGBA")
    if len(pose_names) != columns * rows:
        raise ValueError("Pose-name count must match columns x rows")
    cell_w, cell_h = sheet.width // columns, sheet.height // rows
    cells = [
        sheet.crop((x * cell_w, y * cell_h,
                    sheet.width if x == columns - 1 else (x + 1) * cell_w,
                    sheet.height if y == rows - 1 else (y + 1) * cell_h))
        for y in range(rows)
        for x in range(columns)
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

    reference = Image.open(reference_path).convert("RGBA") if reference_path else None
    if reference and reference.size != CANVAS:
        raise ValueError("The comparison frame must be 640x420")
    reference_area = opaque_area(reference) if reference else 0

    for name, cell, box in zip(pose_names, cells, boxes, strict=True):
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
        ratio = opaque_area(frame) / reference_area if reference_area else None
        if ratio is not None and not mass_min <= ratio <= mass_max:
            raise ValueError(f"{name}: mass ratio {ratio:.2f} outside heavy-enemy pilot range")
        print(f"{name}: {size[0]}x{size[1]}, left={left}, bottom={top + size[1]}"
              + (f", mass ratio={ratio:.2f}x" if ratio is not None else ""))

        if reference is not None and name == "guard_open":
            proof = Image.new("RGBA", (1280, 420), "#24232a")
            proof.alpha_composite(reference, (0, 0))
            proof.alpha_composite(frame, (640, 0))
            draw = ImageDraw.Draw(proof)
            draw.line((0, BASELINE_Y, 1280, BASELINE_Y), fill="#efbd62", width=2)
            draw.text((20, 20), "MERCO - runtime idle", fill="white")
            draw.text((660, 20), f"BARBACCIA - guard / mass {ratio:.2f}x", fill="white")
            proof.convert("RGB").save(output_dir / "scale_vs_merco.png")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sheet", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--visual-height", type=int, default=318)
    parser.add_argument("--reference", type=Path,
                        help="Optional 640x420 Merco frame for mass-ratio QA and comparison proof")
    parser.add_argument("--columns", type=int, default=2)
    parser.add_argument("--rows", type=int, default=2)
    parser.add_argument("--pose-names", nargs="+", default=list(POSE_NAMES))
    parser.add_argument("--mass-min", type=float, default=1.75)
    parser.add_argument("--mass-max", type=float, default=2.35)
    args = parser.parse_args()
    prepare(args.sheet, args.output_dir, args.visual_height, args.reference,
            args.columns, args.rows, tuple(args.pose_names), args.mass_min, args.mass_max)
