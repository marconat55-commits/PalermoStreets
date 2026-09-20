#!/usr/bin/env python3
"""Read MUGEN reference archives without extracting or importing their artwork."""

from __future__ import annotations

import argparse
import io
import json
import re
import struct
import subprocess
import zipfile
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True


def members(path: Path) -> dict[str, bytes]:
    if path.suffix.lower() == ".zip":
        with zipfile.ZipFile(path) as source:
            return {
                name: source.read(name)
                for name in source.namelist()
                if name.lower().endswith((".air", ".sff", ".def", ".act")) and "/backup/" not in name.lower()
            }
    if path.suffix.lower() == ".rar":
        listing = subprocess.run(["tar", "-tf", str(path)], capture_output=True, check=True).stdout.decode("utf-8", "replace")
        result = {}
        for name in listing.splitlines():
            if name.lower().endswith((".air", ".sff", ".def", ".act")):
                result[name] = subprocess.run(
                    ["tar", "-xOf", str(path), name], capture_output=True, check=True
                ).stdout
        return result
    raise ValueError(f"Unsupported archive: {path}")


def read_actions(data: bytes) -> dict[int, list[dict[str, int]]]:
    actions: dict[int, list[dict[str, int]]] = {}
    current: list[dict[str, int]] | None = None
    for raw in data.decode("latin-1").splitlines():
        line = raw.split(";", 1)[0].strip()
        heading = re.match(r"\[\s*Begin\s+Action\s+(-?\d+)\s*\]", line, re.I)
        if heading:
            current = actions.setdefault(int(heading.group(1)), [])
            continue
        if current is None or not re.match(r"^-?\d+\s*,", line):
            continue
        cells = [cell.strip() for cell in line.split(",")]
        try:
            group, sprite, x, y, ticks = map(int, cells[:5])
        except (ValueError, TypeError):
            continue
        current.append({"group": group, "sprite": sprite, "x": x, "y": y, "ticks": ticks})
    return actions


def read_sff_v1(data: bytes) -> dict:
    if not data.startswith(b"ElecbyteSpr") or data[15] != 1:
        return {"format": "unsupported"}
    groups, declared, offset, subheader_size = struct.unpack_from("<4I", data, 16)
    # Some fan-made SFF v1 files declare 512 while still using 32-byte records.
    if subheader_size > 64 and offset + 32 < len(data) and data[offset + 32] == 10:
        subheader_size = 32
    sizes: list[tuple[int, int]] = []
    sprites: list[tuple[int, int]] = []
    for _ in range(declared):
        if offset < 0 or offset + 32 > len(data):
            break
        next_offset, length = struct.unpack_from("<II", data, offset)
        group, sprite = struct.unpack_from("<HH", data, offset + 12)
        sprites.append((group, sprite))
        pcx = offset + subheader_size
        if length >= 128 and pcx + 128 <= len(data) and data[pcx] == 10:
            x0, y0, x1, y1 = struct.unpack_from("<4H", data, pcx + 4)
            sizes.append((x1 - x0 + 1, y1 - y0 + 1))
        if next_offset == 0:
            break
        offset = next_offset
    return {
        "format": "SFF v1", "groups": groups, "declared_sprites": declared,
        "parsed_sprites": len(sprites), "unique_ids": len(set(sprites)),
        "known_sizes": len(sizes),
        "sprite_width_range": [min((w for w, _ in sizes), default=0), max((w for w, _ in sizes), default=0)],
        "sprite_height_range": [min((h for _, h in sizes), default=0), max((h for _, h in sizes), default=0)],
        "common_sizes": Counter(sizes).most_common(8),
    }


def sprite_images(data: bytes, act: bytes | None) -> dict[tuple[int, int], Image.Image]:
    _, declared, offset, subheader_size = struct.unpack_from("<4I", data, 16)
    if subheader_size > 64 and data[offset + 32] == 10:
        subheader_size = 32
    previous: list[Image.Image | None] = []
    images = {}
    for _ in range(declared):
        if offset + 32 > len(data):
            break
        next_offset, length = struct.unpack_from("<II", data, offset)
        group, sprite, previous_index = struct.unpack_from("<HHH", data, offset + 12)
        image = None
        if length >= 128:
            try:
                indexed = Image.open(io.BytesIO(data[offset + subheader_size:offset + subheader_size + length]))
                indexed.load()
                if act and indexed.mode == "P" and len(act) >= 768:
                    indexed.putpalette(b"".join(act[i:i + 3] for i in range(765, -1, -3)))
                image = indexed.convert("RGBA")
                if indexed.mode == "P":
                    mask = bytes(0 if value == 0 else 255 for value in indexed.tobytes())
                    image.putalpha(Image.frombytes("L", indexed.size, mask))
            except OSError:
                pass
        elif previous_index < len(previous):
            image = previous[previous_index]
        previous.append(image)
        if image is not None:
            images[(group, sprite)] = image
        if not next_offset:
            break
        offset = next_offset
    return images


def write_contact(path: Path, air: bytes, sff: bytes, act: bytes | None,
                  destination: Path) -> None:
    actions = read_actions(air)
    images = sprite_images(sff, act)
    selected = [0, 20, 100, 200, 220, 5000, 5050, 5120]
    rows = [(number, actions[number]) for number in selected if number in actions]
    cell_w, cell_h, label_w = 155, 190, 85
    board = Image.new("RGB", (label_w + cell_w * 6, cell_h * len(rows)), "#292930")
    draw = ImageDraw.Draw(board)
    for row, (number, frames) in enumerate(rows):
        draw.text((8, row * cell_h + 12), f"Action {number}", fill="white")
        seen = set()
        unique = []
        for frame in frames:
            key = (frame["group"], frame["sprite"])
            if key not in seen:
                unique.append((key, frame["ticks"]))
                seen.add(key)
        for column, (key, ticks) in enumerate(unique[:6]):
            image = images.get(key)
            if image is None:
                continue
            image = image.copy()
            image.thumbnail((cell_w - 12, cell_h - 28), Image.Resampling.NEAREST)
            x = label_w + column * cell_w + (cell_w - image.width) // 2
            y = row * cell_h + cell_h - 18 - image.height
            board.paste(image, (x, y), image)
            draw.text((label_w + column * cell_w + 5, row * cell_h + 4),
                      f"{key[0]},{key[1]} / {ticks}t", fill="#e8dbad")
    destination.mkdir(parents=True, exist_ok=True)
    board.save(destination / f"{path.stem}_contact.png")


def audit(path: Path, contact_dir: Path | None = None) -> dict:
    files = members(path)
    air = next((value for name, value in files.items() if name.lower().endswith(".air")), None)
    sff = next((value for name, value in files.items() if name.lower().endswith(".sff")), None)
    if air is None or sff is None:
        raise ValueError(f"Missing AIR or SFF: {path}")
    if contact_dir is not None:
        acts = [(name, value) for name, value in files.items() if name.lower().endswith(".act")]
        acts.sort(key=lambda entry: ("original.act" not in entry[0].lower(),
                                     "/01.act" not in entry[0].lower(), entry[0]))
        write_contact(path, air, sff, acts[0][1] if acts else None, contact_dir)
    actions = read_actions(air)
    ids = [0, 10, 20, 21, 40, 41, 42, 100, 105, 200, 210, 220, 230, 240, 5000, 5050, 5100, 5120]
    key_actions = {}
    for action_id in ids:
        frames = actions.get(action_id)
        if frames:
            key_actions[str(action_id)] = {
                "entries": len(frames),
                "unique_sprites": len({(frame["group"], frame["sprite"]) for frame in frames}),
                "ticks": [frame["ticks"] for frame in frames],
            }
    all_frames = [frame for frames in actions.values() for frame in frames]
    return {
        "archive": path.name,
        "sff": read_sff_v1(sff),
        "air_actions": len(actions),
        "air_entries": len(all_frames),
        "air_unique_sprite_ids": len({(frame["group"], frame["sprite"]) for frame in all_frames}),
        "action_ids": sorted(actions),
        "key_actions": key_actions,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archives", nargs="+", type=Path)
    parser.add_argument("--contact-dir", type=Path,
                        help="Write local visual inspection sheets; never import source sprites")
    args = parser.parse_args()
    print(json.dumps([audit(path, args.contact_dir) for path in args.archives], indent=2))
