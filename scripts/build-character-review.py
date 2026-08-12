#!/usr/bin/env python3
"""Build deterministic human-review sheets from active character frames."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


CELL_WIDTH = 340
CELL_HEIGHT = 270
LABEL_HEIGHT = 42
COLUMNS = 4


def font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default()


def checker(size: tuple[int, int]) -> Image.Image:
    image = Image.new("RGB", size, "#9da1a6")
    draw = ImageDraw.Draw(image)
    tile = 20
    for y in range(0, size[1], tile):
        for x in range(0, size[0], tile):
            if (x // tile + y // tile) % 2 == 0:
                draw.rectangle((x, y, x + tile - 1, y + tile - 1), fill="#c9cbce")
    return image


def active_frames(spec: dict) -> list[int]:
    frames = int(spec["frames"])
    return list(spec.get("frame_sequence") or range(1, frames + 1))[:frames]


def paste_cell(sheet: Image.Image, index: int, source: Path, title: str, canonical: bool) -> None:
    row, column = divmod(index, COLUMNS)
    x = column * CELL_WIDTH
    y = row * (CELL_HEIGHT + LABEL_HEIGHT)
    sheet.paste(checker((CELL_WIDTH, CELL_HEIGHT)), (x, y + LABEL_HEIGHT))
    with Image.open(source) as opened:
        frame = opened.convert("RGBA")
        frame.thumbnail((CELL_WIDTH - 12, CELL_HEIGHT - 12), Image.Resampling.LANCZOS)
        frame_x = x + (CELL_WIDTH - frame.width) // 2
        frame_y = y + LABEL_HEIGHT + CELL_HEIGHT - frame.height - 6
        sheet.paste(frame, (frame_x, frame_y), frame)
    draw = ImageDraw.Draw(sheet)
    color = "#53dc88" if canonical else "#ffd166"
    draw.rectangle((x, y, x + CELL_WIDTH - 1, y + LABEL_HEIGHT - 1), fill="#181a1d")
    draw.text((x + 8, y + 10), title, fill=color, font=font(17))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_root")
    parser.add_argument("--character", required=True)
    parser.add_argument("--clips", nargs="+", required=True)
    args = parser.parse_args()

    root = Path(args.project_root).resolve()
    profile_path = root / "public" / "data" / "characters" / f"{args.character}.json"
    profile = json.loads(profile_path.read_text(encoding="utf-8"))
    animation_root = root / "public" / profile["assets"]["animation_root"]
    idle_spec = profile["animations"]["idle"]
    canonical_source = active_frames(idle_spec)[0]
    canonical_path = animation_root / idle_spec["folder"] / f"{canonical_source:02d}.png"
    output = root / "production-preview" / "character_review" / args.character
    output.mkdir(parents=True, exist_ok=True)

    manifest = {
        "schema": 1,
        "character": args.character,
        "canonical_reference": str(canonical_path.relative_to(root)).replace("\\", "/"),
        "status": "pending_human_identity_review",
        "clips": [],
    }
    for clip_name in args.clips:
        spec = profile["animations"][clip_name]
        sources = active_frames(spec)
        items = [(canonical_path, "RIFERIMENTO CANONICO", True)]
        for runtime_index, source_index in enumerate(sources, start=1):
            source = animation_root / spec["folder"] / f"{source_index:02d}.png"
            items.append((source, f"{clip_name} R{runtime_index:02d} / S{source_index:02d}", False))
        rows = (len(items) + COLUMNS - 1) // COLUMNS
        sheet = Image.new("RGB", (COLUMNS * CELL_WIDTH, rows * (CELL_HEIGHT + LABEL_HEIGHT)), "#202226")
        for index, (source, title, canonical) in enumerate(items):
            paste_cell(sheet, index, source, title, canonical)
        target = output / f"{clip_name}_identity_review.jpg"
        sheet.save(target, quality=91, optimize=True)
        manifest["clips"].append({
            "name": clip_name,
            "sheet": str(target.relative_to(root)).replace("\\", "/"),
            "source_frames": sources,
            "status": "pending_human_identity_review",
        })

    (output / "review_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
