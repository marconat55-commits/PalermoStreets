#!/usr/bin/env python3
"""Build lossless, trimmed PixiJS texture atlases without changing source PNGs."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops

MAX_PAGE = 2048
PADDING = 2


@dataclass
class Cell:
    key: str
    source: Path
    image: Image.Image
    source_width: int
    source_height: int
    source_x: int
    source_y: int

    @property
    def width(self) -> int:
        return self.image.width

    @property
    def height(self) -> int:
        return self.image.height


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def collect_cells(public: Path, profile: dict) -> list[Cell]:
    root = public / profile["assets"]["animation_root"]
    unique: dict[str, Path] = {}
    for spec in profile["animations"].values():
        for index in range(1, spec["frames"] + 1):
            key = f'{spec["folder"]}/{index:02d}.png'
            unique[key] = root / key

    cells: list[Cell] = []
    for key, path in sorted(unique.items()):
        source = Image.open(path).convert("RGBA")
        alpha = source.getchannel("A")
        bounds = alpha.getbbox()
        if bounds is None:
            raise ValueError(f"{profile['id']}: frame completamente trasparente: {key}")
        left, top, right, bottom = bounds
        cropped = source.crop(bounds)
        cells.append(Cell(key, path, cropped, source.width, source.height, left, top))
    return cells


def pack(cells: list[Cell]) -> tuple[list[Image.Image], dict[str, dict]]:
    pages: list[Image.Image] = []
    frames: dict[str, dict] = {}
    remaining = sorted(cells, key=lambda cell: (-cell.height, -cell.width, cell.key))

    while remaining:
        placements: list[tuple[Cell, int, int]] = []
        deferred: list[Cell] = []
        x = PADDING
        y = PADDING
        row_height = 0
        used_width = 1
        used_height = 1
        for cell in remaining:
            if cell.width + PADDING * 2 > MAX_PAGE or cell.height + PADDING * 2 > MAX_PAGE:
                raise ValueError(f"Frame troppo grande per atlas: {cell.key} ({cell.width}x{cell.height})")
            if x + cell.width + PADDING > MAX_PAGE:
                x = PADDING
                y += row_height + PADDING
                row_height = 0
            if y + cell.height + PADDING > MAX_PAGE:
                deferred.append(cell)
                continue
            placements.append((cell, x, y))
            used_width = max(used_width, x + cell.width + PADDING)
            used_height = max(used_height, y + cell.height + PADDING)
            x += cell.width + PADDING
            row_height = max(row_height, cell.height)

        if not placements:
            raise RuntimeError("Packing atlas bloccato")
        page_index = len(pages)
        page = Image.new("RGBA", (used_width, used_height), (0, 0, 0, 0))
        for cell, px, py in placements:
            page.alpha_composite(cell.image, (px, py))
            frames[cell.key] = {
                "page": page_index,
                "x": px,
                "y": py,
                "width": cell.width,
                "height": cell.height,
                "source_width": cell.source_width,
                "source_height": cell.source_height,
                "source_x": cell.source_x,
                "source_y": cell.source_y,
            }
        pages.append(page)
        remaining = deferred
    return pages, frames


def verify(cells: list[Cell], pages: list[Image.Image], frames: dict[str, dict]) -> None:
    for cell in cells:
        item = frames[cell.key]
        atlas_crop = pages[item["page"]].crop((
            item["x"], item["y"], item["x"] + item["width"], item["y"] + item["height"]
        ))
        if ImageChops.difference(atlas_crop, cell.image).getbbox() is not None:
            raise RuntimeError(f"Verifica pixel fallita: {cell.key}")


def build_profile(public: Path, profile: dict) -> tuple[int, int, int]:
    cells = collect_cells(public, profile)
    pages, frames = pack(cells)
    verify(cells, pages, frames)
    atlas_dir = public / profile["assets"]["animation_root"] / "atlas"
    atlas_dir.mkdir(parents=True, exist_ok=True)
    for old in atlas_dir.glob("atlas_*.png"):
        old.unlink()
    page_specs = []
    for index, page in enumerate(pages, start=1):
        filename = f"atlas_{index:02d}.png"
        page.save(atlas_dir / filename, format="PNG", optimize=True, compress_level=9)
        page_specs.append({"file": filename, "width": page.width, "height": page.height})
    manifest = {"schema": 1, "pages": page_specs, "frames": frames}
    (atlas_dir / "atlas.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    decoded = sum(page.width * page.height * 4 for page in pages)
    return len(cells), len(pages), decoded


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("project", type=Path, help="Root del progetto PixiJS")
    parser.add_argument("--character", help="Ricostruisce soltanto il personaggio indicato")
    args = parser.parse_args()
    project = args.project.resolve()
    public = project / "public"
    index = load_json(public / "data/characters/index.json")
    total_frames = total_pages = total_decoded = 0
    character_ids = [args.character] if args.character else index["characters"]
    if args.character and args.character not in index["characters"]:
        raise ValueError(f"Personaggio non registrato: {args.character}")
    for character_id in character_ids:
        profile = load_json(public / f"data/characters/{character_id}.json")
        frames, pages, decoded = build_profile(public, profile)
        total_frames += frames
        total_pages += pages
        total_decoded += decoded
        print(f"OK {character_id}: {frames} frame unici, {pages} pagine, {decoded / 1048576:.1f} MiB decoded")
    print(f"OK totale: {total_frames} frame, {total_pages} pagine, {total_decoded / 1048576:.1f} MiB decoded")


if __name__ == "__main__":
    main()
